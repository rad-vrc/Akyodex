/**
 * API Route: Upload Akyo (CSV Update + Image Upload)
 * POST /api/upload-akyo
 * 
 * Handles (in order):
 * 1. Validate session and inputs
 * 2. Update CSV file via GitHub API (commit first)
 * 3. Upload cropped image to Cloudflare R2 (after CSV success)
 * 4. Return success status
 * 
 * Order is important: CSV commit happens first to prevent orphaned R2 images.
 * If R2 upload fails after CSV commit, we return success with a warning.
 * 
 * This endpoint requires server-side authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession, validateOrigin, validateAkyoId } from '@/lib/api-helpers';
import { parseCSV, stringifyCSV, createAkyoRecord, findRecordById } from '@/lib/csv-utils';

// Use Node.js runtime for Buffer and R2 binding access
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // CSRF Protection: Validate Origin/Referer
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { success: false, error: '不正なリクエスト元です' },
        { status: 403 }
      );
    }

    // Validate authentication
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    const id = formData.get('id') as string;
    const nickname = formData.get('nickname') as string;
    const avatarName = formData.get('avatarName') as string;
    const attributes = formData.get('attributes') as string;
    const creator = formData.get('creator') as string;
    const avatarUrl = formData.get('avatarUrl') as string;
    const notes = formData.get('notes') as string;
    const imageData = formData.get('imageData') as string; // Base64 data URL

    // Validate required fields and ID format
    if (!id || !avatarName || !creator) {
      return NextResponse.json(
        { success: false, error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // Validate ID format (must be 4-digit numeric: 0001-9999)
    if (!validateAkyoId(id)) {
      return NextResponse.json(
        { success: false, error: '有効な4桁ID（0001-9999）が必要です' },
        { status: 400 }
      );
    }

    // Step 1: Update CSV via GitHub API (do this FIRST to prevent orphaned R2 images)
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      const repoOwner = process.env.GITHUB_REPO_OWNER;
      const repoName = process.env.GITHUB_REPO_NAME;
      const branch = process.env.GITHUB_BRANCH || 'main';

      if (!githubToken || !repoOwner || !repoName) {
        console.error('[upload-akyo] GitHub credentials not configured');
        return NextResponse.json(
          { success: false, error: 'GitHub設定が不足しています' },
          { status: 500 }
        );
      }

      // Fetch current CSV content
      const csvPath = 'data/akyo-data.csv';
      const getFileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${csvPath}?ref=${branch}`;
      
      // 30-second timeout for GitHub API request
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), 30000);
      
      let getResponse;
      try {
        getResponse = await fetch(getFileUrl, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          signal: getController.signal,
        });
        clearTimeout(getTimeoutId);
      } catch (error) {
        clearTimeout(getTimeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('GitHub API request timed out (30s)');
        }
        throw error;
      }

      if (!getResponse.ok) {
        throw new Error(`GitHub API error: ${getResponse.status}`);
      }

      const fileData = await getResponse.json() as { content: string; sha: string };
      const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
      
      // Parse CSV properly (handles quoted fields, commas, newlines)
      const records = parseCSV(currentContent);
      
      if (records.length === 0) {
        throw new Error('CSV file is empty');
      }
      
      const [header, ...dataRecords] = records;
      
      // Check for duplicate ID
      const duplicateRecord = findRecordById(dataRecords, id);
      if (duplicateRecord) {
        return NextResponse.json(
          { success: false, error: `ID ${id} は既に使用されています` },
          { status: 409 }
        );
      }
      
      // Create new record
      const newRecord = createAkyoRecord({
        id,
        nickname,
        avatarName,
        attributes,
        creator,
        avatarUrl,
        notes,
      });
      
      // Add new record
      dataRecords.push(newRecord);
      
      // Reconstruct CSV with header
      const allRecords = [header, ...dataRecords];
      const newContent = stringifyCSV(allRecords);

      // Commit updated CSV to GitHub
      const updateUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${csvPath}`;
      
      // 30-second timeout for GitHub API commit
      const updateController = new AbortController();
      const updateTimeoutId = setTimeout(() => updateController.abort(), 30000);
      
      let updateResponse;
      try {
        updateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Add Akyo #${id}: ${String(avatarName ?? '').replace(/[\r\n]+/g, ' ').slice(0, 100)}`,
            content: Buffer.from(newContent).toString('base64'),
            sha: fileData.sha,
            branch: branch,
          }),
          signal: updateController.signal,
        });
        clearTimeout(updateTimeoutId);
      } catch (error) {
        clearTimeout(updateTimeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('GitHub API commit timed out (30s)');
        }
        throw error;
      }

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(`GitHub commit failed: ${errorData.message || updateResponse.status}`);
      }

      const commitData = await updateResponse.json() as { commit: { html_url: string } };

      // Step 2: Upload image to R2 (AFTER successful CSV commit)
      let imageUploaded = false;
      if (imageData) {
        try {
          // Validate image format (WebP only - client converts to WebP before upload)
          if (!/^data:image\/webp;base64,/.test(imageData)) {
            throw new Error('Only WebP format is supported (client converts before upload)');
          }

          // Convert base64 data URL to buffer
          const base64Data = imageData.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');

          // Validate size limit (5MB)
          const MAX = 5 * 1024 * 1024; // 5MB
          if (buffer.byteLength > MAX) {
            throw new Error('Image too large (max 5MB)');
          }
          
          // Access R2 bucket through Cloudflare Pages binding
          // IMPORTANT: Use @opennextjs/cloudflare to access Cloudflare bindings in Next.js
          // The binding name "AKYO_BUCKET" (configured in wrangler.toml or Pages settings)
          // is accessed via getCloudflareContext().env.AKYO_BUCKET
          // 
          // This is the correct method for Cloudflare Pages + Next.js:
          // - In production: Cloudflare injects bindings via platform context
          // - In local dev: undefined (wrangler dev would inject it, but npm run dev doesn't)
          // 
          // Reference: https://opennext.js.org/cloudflare
          let r2Bucket: any;
          try {
            const context = getCloudflareContext();
            r2Bucket = context?.env?.AKYO_BUCKET;
          } catch (error) {
            console.warn('[upload-akyo] getCloudflareContext() not available (local dev?):', error);
            r2Bucket = undefined;
          }
          
          if (r2Bucket && typeof r2Bucket === 'object' && typeof r2Bucket.put === 'function') {
            // Upload to R2 with proper key format (WebP)
            const imageKey = `${id}.webp`;
            await r2Bucket.put(imageKey, buffer, {
              httpMetadata: {
                contentType: 'image/webp',
              },
            });
            
            console.log(`[upload-akyo] Image uploaded to R2: ${imageKey}`);
            imageUploaded = true;
          } else {
            // R2 binding not available (local development or misconfigured)
            console.warn('[upload-akyo] R2 binding not available, skipping image upload');
            console.warn('[upload-akyo] Ensure AKYO_BUCKET is bound in Cloudflare Pages settings');
            imageUploaded = false;
          }
        } catch (error) {
          // Image upload failed, but CSV is already committed
          // Log error but don't fail the entire operation
          console.error('[upload-akyo] Image upload error (CSV already committed):', error);
          return NextResponse.json({
            success: true,
            message: 'Akyoを登録しましたが、画像のアップロードに失敗しました',
            imageUploaded: false,
            commitUrl: commitData.commit.html_url,
            warning: '画像のアップロードに失敗しました。後で再試行してください。',
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Akyoを登録しました',
        imageUploaded,
        commitUrl: commitData.commit.html_url,
      });

    } catch (error) {
      console.error('[upload-akyo] GitHub API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'CSVの更新に失敗しました',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[upload-akyo] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

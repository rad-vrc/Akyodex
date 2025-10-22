/**
 * API Route: Delete Akyo (CSV + R2 Image)
 * POST /api/delete-akyo
 * 
 * Handles:
 * 1. Remove entry from CSV file via GitHub API
 * 2. Delete image from Cloudflare R2
 * 3. Return success status
 * 
 * This endpoint requires OWNER-ONLY authentication (not available to regular admins).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { validateSession, validateOrigin, validateAkyoId } from '@/lib/api-helpers';
import { parseCSV, stringifyCSV, filterOutRecordById, findRecordById } from '@/lib/csv-utils';

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

    // Validate authentication and check for OWNER role
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // OWNER-ONLY check
    if (session.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: '削除機能はらど（上位管理者）のみ使用できます' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    // Validate ID format (must be 4-digit numeric: 0001-9999)
    if (!id || typeof id !== 'string' || !validateAkyoId(id)) {
      return NextResponse.json(
        { success: false, error: '有効な4桁ID（0001-9999）が必要です' },
        { status: 400 }
      );
    }

    // Step 1: Delete from CSV via GitHub API
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      const repoOwner = process.env.GITHUB_REPO_OWNER;
      const repoName = process.env.GITHUB_REPO_NAME;
      const branch = process.env.GITHUB_BRANCH || 'main';

      if (!githubToken || !repoOwner || !repoName) {
        console.error('[delete-akyo] GitHub credentials not configured');
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
      
      // Find the record to delete (for commit message)
      const recordToDelete = findRecordById(dataRecords, id);
      
      if (!recordToDelete) {
        return NextResponse.json(
          { success: false, error: `ID: ${id} が見つかりませんでした` },
          { status: 404 }
        );
      }
      
      // Extract avatar name for commit message (3rd column, index 2)
      const deletedAvatarName = String(recordToDelete[2] ?? '').trim() || 'Unknown';
      
      // Filter out the record
      const filteredRecords = filterOutRecordById(dataRecords, id);
      
      // Reconstruct CSV with header
      const allRecords = [header, ...filteredRecords];
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
            message: `Delete Akyo #${id}: ${String(deletedAvatarName ?? '').replace(/[\r\n]+/g, ' ').slice(0, 100)}`,
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

      // Step 2: Delete image from R2 (if exists)
      let imageDeleted = false;
      try {
        // Access R2 bucket through Cloudflare Pages binding
        // See upload-akyo/route.ts for detailed explanation
        let r2Bucket: any;
        try {
          const context = getCloudflareContext();
          r2Bucket = context?.env?.AKYO_BUCKET;
        } catch (error) {
          console.warn('[delete-akyo] getCloudflareContext() not available (local dev?):', error);
          r2Bucket = undefined;
        }
        
        if (r2Bucket && typeof r2Bucket === 'object' && typeof r2Bucket.delete === 'function') {
          // Delete from R2 with proper key format (WebP)
          const imageKey = `${id}.webp`;
          await r2Bucket.delete(imageKey);
          
          console.log(`[delete-akyo] Image deleted from R2: ${imageKey}`);
          imageDeleted = true;
        } else {
          // R2 binding not available (local development or misconfigured)
          console.warn('[delete-akyo] R2 binding not available, skipping image deletion');
          console.warn('[delete-akyo] Ensure AKYO_BUCKET is bound in Cloudflare Pages settings');
          imageDeleted = false;
        }
      } catch (error) {
        console.error('[delete-akyo] Image deletion warning:', error);
        // Don't fail the entire operation if image deletion fails
        // The CSV has already been updated
      }

      return NextResponse.json({
        success: true,
        message: `Akyoを削除しました (ID: ${id})`,
        imageDeleted,
        commitUrl: commitData.commit.html_url,
      });

    } catch (error) {
      console.error('[delete-akyo] GitHub API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'CSVの削除に失敗しました',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[delete-akyo] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

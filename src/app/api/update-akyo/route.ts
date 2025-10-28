/**
 * API Route: Update Akyo (CSV Update + Image Update)
 * POST /api/update-akyo
 * 
 * Handles (in order):
 * 1. Validate session and inputs
 * 2. Update CSV file via GitHub API (commit first)
 * 3. Update cropped image to Cloudflare R2 (after CSV success, if provided)
 * 4. Return success status
 * 
 * Order is important: CSV commit happens first to prevent orphaned R2 images.
 * If R2 update fails after CSV commit, we return success with a warning.
 * 
 * This endpoint requires server-side authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession, validateOrigin, validateAkyoId } from '@/lib/api-helpers';
import { parseCSV, stringifyCSV, createAkyoRecord, replaceRecordById, findRecordById } from '@/lib/csv-utils';
import { fetchCSVFromGitHub, commitCSVToGitHub } from '@/lib/github-utils';
import { uploadImageToR2 } from '@/lib/r2-utils';

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
      // Fetch current CSV content
      const { content: currentContent, sha: fileSha } = await fetchCSVFromGitHub();
      
      // Parse CSV properly (handles quoted fields, commas, newlines)
      const records = parseCSV(currentContent);
      
      if (records.length === 0) {
        throw new Error('CSV file is empty');
      }
      
      const [header, ...dataRecords] = records;
      
      // Check if record exists
      const existingRecord = findRecordById(dataRecords, id);
      if (!existingRecord) {
        return NextResponse.json(
          { success: false, error: `ID: ${id} が見つかりませんでした` },
          { status: 404 }
        );
      }
      
      // Create updated record
      const updatedRecord = createAkyoRecord({
        id,
        nickname,
        avatarName,
        attributes,
        creator,
        avatarUrl,
        notes,
      });
      
      // Replace record
      const updatedRecords = replaceRecordById(dataRecords, id, updatedRecord);
      
      // Reconstruct CSV with header
      const allRecords = [header, ...updatedRecords];
      const newContent = stringifyCSV(allRecords);

      // Commit updated CSV to GitHub
      const commitMessage = `Update Akyo #${id}: ${String(avatarName ?? '').replace(/[\r\n]+/g, ' ').slice(0, 100)}`;
      const commitData = await commitCSVToGitHub(newContent, fileSha, commitMessage);

      // Step 2: Update image to R2 (AFTER successful CSV commit, if provided)
      let imageUpdated = false;
      if (imageData) {
        const uploadResult = await uploadImageToR2(id, imageData);
        
        if (!uploadResult.success) {
          // Image update failed, but CSV is already committed
          console.error('[update-akyo] Image update error:', uploadResult.error);
          return NextResponse.json({
            success: true,
            message: 'Akyoを更新しましたが、画像の更新に失敗しました',
            imageUpdated: false,
            commitUrl: commitData.commit.html_url,
            warning: uploadResult.error || '画像の更新に失敗しました。後で再試行してください。',
          });
        }
        
        imageUpdated = true;
      }

      return NextResponse.json({
        success: true,
        message: 'Akyoを更新しました',
        imageUpdated,
        commitUrl: commitData.commit.html_url,
      });

    } catch (error) {
      console.error('[update-akyo] GitHub API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'CSVの更新に失敗しました',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[update-akyo] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

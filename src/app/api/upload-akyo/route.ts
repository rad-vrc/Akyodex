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
import { validateSession, validateOrigin, parseAkyoFormData } from '@/lib/api-helpers';
import { parseCSV, stringifyCSV, createAkyoRecord, findRecordById } from '@/lib/csv-utils';
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
    const parsedForm = parseAkyoFormData(formData);

    if (!parsedForm.success) {
      return NextResponse.json(
        { success: false, error: parsedForm.error },
        { status: parsedForm.status }
      );
    }

    const {
      id,
      nickname,
      avatarName,
      attributes,
      creator,
      avatarUrl,
      notes,
      imageData,
    } = parsedForm.data;

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
      const commitMessage = `Add Akyo #${id}: ${String(avatarName ?? '').replace(/[\r\n]+/g, ' ').slice(0, 100)}`;
      const commitData = await commitCSVToGitHub(newContent, fileSha, commitMessage);

      // Step 2: Upload image to R2 (AFTER successful CSV commit)
      let imageUploaded = false;
      if (imageData) {
        const uploadResult = await uploadImageToR2(id, imageData);
        
        if (!uploadResult.success) {
          // Image upload failed, but CSV is already committed
          console.error('[upload-akyo] Image upload error:', uploadResult.error);
          return NextResponse.json({
            success: true,
            message: 'Akyoを登録しましたが、画像のアップロードに失敗しました',
            imageUploaded: false,
            commitUrl: commitData.commit.html_url,
            warning: uploadResult.error || '画像のアップロードに失敗しました。後で再試行してください。',
          });
        }
        
        imageUploaded = true;
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

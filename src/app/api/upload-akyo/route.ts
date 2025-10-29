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

import type { AkyoFormData, AkyoFormParseResult } from '@/lib/api-helpers';
import { ensureAdminRequest, jsonError, parseAkyoFormData } from '@/lib/api-helpers';
import { commitAkyoCsv, createAkyoRecord, findRecordById, formatAkyoCommitMessage, loadAkyoCsv } from '@/lib/csv-utils';
import type { R2UploadOptions, R2UploadResult } from '@/lib/r2-utils';
import { uploadImageToR2 } from '@/lib/r2-utils';
import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for Buffer and R2 binding access
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const guard = await ensureAdminRequest(request);
    if ('response' in guard) {
      return guard.response;
    }

    const formData = await request.formData();
    const parsedForm: AkyoFormParseResult = parseAkyoFormData(formData);

    if (!parsedForm.success) {
      return jsonError(parsedForm.error, parsedForm.status);
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
    }: AkyoFormData = parsedForm.data;

    // Step 1: Update CSV via GitHub API (do this FIRST to prevent orphaned R2 images)
    try {
      const { header, dataRecords, fileSha } = await loadAkyoCsv();

      // Check for duplicate ID
      const duplicateRecord = findRecordById(dataRecords, id);
      if (duplicateRecord) {
        return jsonError(`ID ${id} は既に使用されています`, 409);
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
      // Commit updated CSV to GitHub
      const commitMessage = formatAkyoCommitMessage('Add', id, avatarName);
      const commitData = await commitAkyoCsv({
        header,
        dataRecords,
        fileSha,
        commitMessage,
      });

      // Step 2: Upload image to R2 (AFTER successful CSV commit)
      let imageUploaded = false;
      if (imageData) {
        const uploadOptions: R2UploadOptions = {
          contentType: 'image/webp',
          maxSizeBytes: 5 * 1024 * 1024,
        };
        const uploadResult: R2UploadResult = await uploadImageToR2(id, imageData, uploadOptions);

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
      return jsonError(
        error instanceof Error ? error.message : 'CSVの更新に失敗しました',
        500
      );
    }

  } catch (error) {
    console.error('[upload-akyo] Unexpected error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      500
    );
  }
}

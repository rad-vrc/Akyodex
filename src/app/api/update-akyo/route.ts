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

import type { AkyoFormData, AkyoFormParseResult } from '@/lib/api-helpers';
import { ensureAdminRequest, jsonError, parseAkyoFormData } from '@/lib/api-helpers';
import { commitAkyoCsv, createAkyoRecord, findRecordById, formatAkyoCommitMessage, loadAkyoCsv, replaceRecordById } from '@/lib/csv-utils';
import type { R2UploadOptions, R2UploadResult } from '@/lib/r2-utils';
import { uploadImageToR2 } from '@/lib/r2-utils';
import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for Buffer and R2 binding access
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const guard = await ensureAdminRequest(request);
    if (guard.response) {
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

      // Check if record exists
      const existingRecord = findRecordById(dataRecords, id);
      if (!existingRecord) {
        return jsonError(`ID: ${id} が見つかりませんでした`, 404);
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
      // Commit updated CSV to GitHub
      const commitMessage = formatAkyoCommitMessage('Update', id, avatarName);
      const commitData = await commitAkyoCsv({
        header,
        dataRecords: updatedRecords,
        fileSha,
        commitMessage,
      });

      // Step 2: Update image to R2 (AFTER successful CSV commit, if provided)
      let imageUpdated = false;
      if (imageData) {
        const uploadOptions: R2UploadOptions = {
          contentType: 'image/webp',
          maxSizeBytes: 5 * 1024 * 1024,
        };
        const uploadResult: R2UploadResult = await uploadImageToR2(id, imageData, uploadOptions);

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
      return jsonError(
        error instanceof Error ? error.message : 'CSVの更新に失敗しました',
        500
      );
    }

  } catch (error) {
    console.error('[update-akyo] Unexpected error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      500
    );
  }
}

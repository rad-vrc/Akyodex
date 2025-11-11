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

import { ensureAdminRequest, jsonError, validateAkyoId } from '@/lib/api-helpers';
import { commitAkyoCsv, filterOutRecordById, findRecordById, formatAkyoCommitMessage, loadAkyoCsv } from '@/lib/csv-utils';
import type { R2UploadResult } from '@/lib/r2-utils';
import { deleteImageFromR2 } from '@/lib/r2-utils';
import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for Buffer and R2 binding access
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const guard = await ensureAdminRequest(request, {
      requireOwner: true,
      ownerErrorMessage: '削除機能はらど（上位管理者）のみ使用できます',
    });
    if ('response' in guard) {
      return guard.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('JSONの解析に失敗しました', 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonError('リクエスト形式が不正です', 400);
    }

    const { id } = body as { id?: unknown };

    if (typeof id !== 'string') {
      return jsonError('有効な4桁ID（0001-9999）が必要です', 400);
    }

    const normalizedId = id.trim();

    // Validate ID format (must be 4-digit numeric: 0001-9999)
    if (!validateAkyoId(normalizedId)) {
      return jsonError('有効な4桁ID（0001-9999）が必要です', 400);
    }

    // Step 1: Delete from CSV via GitHub API
    try {
      const { header, dataRecords, fileSha } = await loadAkyoCsv();

      // Find the record to delete (for commit message)
      const recordToDelete = findRecordById(dataRecords, normalizedId);

      if (!recordToDelete) {
        return jsonError(`ID: ${normalizedId} が見つかりませんでした`, 404);
      }

      // Extract avatar name for commit message (4th column, index 3)
      // CSV structure: [ID, 見た目, 通称, アバター名, ...]
      const deletedAvatarName = String(recordToDelete[3] ?? '').trim() || 'Unknown';

      // Filter out the record
      const filteredRecords = filterOutRecordById(dataRecords, normalizedId);
      // Commit updated CSV to GitHub
      const commitMessage = formatAkyoCommitMessage('Delete', normalizedId, deletedAvatarName);
      const commitData = await commitAkyoCsv({
        header,
        dataRecords: filteredRecords,
        fileSha,
        commitMessage,
      });

      // Step 2: Delete image from R2 (if exists)
      const deleteResult: R2UploadResult = await deleteImageFromR2(normalizedId);

      if (!deleteResult.success) {
        console.error('[delete-akyo] Image deletion warning:', deleteResult.error);
        // Don't fail the entire operation if image deletion fails
        // The CSV has already been updated
      }

      return NextResponse.json({
        success: true,
        message: `Akyoを削除しました (ID: ${normalizedId})`,
        imageDeleted: deleteResult.success,
        commitUrl: commitData.commit.html_url,
      });

    } catch (error) {
      console.error('[delete-akyo] GitHub API error:', error);
      return jsonError(
        error instanceof Error ? error.message : 'CSVの削除に失敗しました',
        500
      );
    }

  } catch (error) {
    console.error('[delete-akyo] Unexpected error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      500
    );
  }
}

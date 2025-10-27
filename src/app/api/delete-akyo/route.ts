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
import { validateSession, validateOrigin, validateAkyoId } from '@/lib/api-helpers';
import { parseCSV, stringifyCSV, filterOutRecordById, findRecordById } from '@/lib/csv-utils';
import { fetchCSVFromGitHub, commitCSVToGitHub } from '@/lib/github-utils';
import { deleteImageFromR2 } from '@/lib/r2-utils';

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
      // Fetch current CSV content
      const { content: currentContent, sha: fileSha } = await fetchCSVFromGitHub();
      
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
      const commitMessage = `Delete Akyo #${id}: ${String(deletedAvatarName ?? '').replace(/[\r\n]+/g, ' ').slice(0, 100)}`;
      const commitData = await commitCSVToGitHub(newContent, fileSha, commitMessage);

      // Step 2: Delete image from R2 (if exists)
      const deleteResult = await deleteImageFromR2(id);
      
      if (!deleteResult.success) {
        console.error('[delete-akyo] Image deletion warning:', deleteResult.error);
        // Don't fail the entire operation if image deletion fails
        // The CSV has already been updated
      }

      return NextResponse.json({
        success: true,
        message: `Akyoを削除しました (ID: ${id})`,
        imageDeleted: deleteResult.success,
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

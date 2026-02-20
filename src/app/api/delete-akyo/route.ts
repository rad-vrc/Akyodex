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

import { connection } from 'next/server';
import { ensureAdminRequest, jsonError, validateAkyoId } from '@/lib/api-helpers';
import { processAkyoCRUD } from '@/lib/akyo-crud-helpers';

/**
 * Node.js Runtime Required
 * 
 * This route MUST use Node.js runtime because it depends on:
 * - csv-parse/sync: Synchronous CSV parsing (not available in Edge Runtime)
 * - csv-stringify/sync: Synchronous CSV stringification (not available in Edge Runtime)
 * - GitHub API: Complex Node.js dependencies via Octokit
 * - R2 Buffer operations: Binary data handling with Node.js Buffer API
 */

export async function POST(request: Request) {
  await connection();
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

    return processAkyoCRUD('delete', { id: normalizedId });

  } catch (error) {
    console.error('[delete-akyo] Unexpected error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      500
    );
  }
}

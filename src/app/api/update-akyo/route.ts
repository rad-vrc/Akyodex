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

import { connection } from 'next/server';
import type { AkyoFormParseResult } from '@/lib/api-helpers';
import { ensureAdminRequest, jsonError, parseAkyoFormData } from '@/lib/api-helpers';
import { processAkyoCRUD } from '@/lib/akyo-crud-helpers';

/**
 * This route requires Node.js runtime because:
 * - Uses csv-parse/sync for synchronous CSV parsing
 * - Uses GitHub API with complex Node.js dependencies
 * - Uses Buffer for R2 binary operations
 */

export async function POST(request: Request) {
  await connection();
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

    return processAkyoCRUD('update', parsedForm.data);

  } catch (error) {
    console.error('[update-akyo] Unexpected error:', error);
    
    // 詳細なエラー情報を返す（デバッグ用）
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return jsonError(
      `Update failed: ${errorMessage}`,
      500,
      { 
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      }
    );
  }
}

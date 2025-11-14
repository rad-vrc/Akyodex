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

import type { AkyoFormParseResult } from '@/lib/api-helpers';
import { ensureAdminRequest, jsonError, parseAkyoFormData } from '@/lib/api-helpers';
import { processAkyoCRUD } from '@/lib/akyo-crud-helpers';

/**
 * This route requires Node.js runtime because:
 * - Uses csv-parse/sync for synchronous CSV parsing
 * - Uses GitHub API with complex Node.js dependencies
 * - Uses Buffer for R2 binary operations (image uploads)
 */
export const runtime = 'nodejs';

export async function POST(request: Request) {
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

    return processAkyoCRUD('add', parsedForm.data);

  } catch (error) {
    console.error('[upload-akyo] Unexpected error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      500
    );
  }
}

/**
 * VRChat World Info API
 * VRChat のワールドページからワールド名と作者名を取得
 */

import { connection } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-helpers';
import { VRCHAT_WORLD_ID_PATTERN } from '@/lib/akyo-entry';
import { fetchVRChatWorldPage } from '@/lib/vrchat-utils';
import { parseVRChatWorldInfoHtml } from '@/lib/vrchat-world-info';

export const runtime = 'nodejs';

function getErrorResponse(error: unknown, fallbackMessage: string): Response {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (error instanceof Error) {
    const statusMatch = error.message.match(/returned (\d{3})/);
    if (statusMatch) {
      return jsonError(error.message, Number.parseInt(statusMatch[1], 10));
    }

    if (/timeout/i.test(error.message)) {
      return jsonError(error.message, 504);
    }
  }

  return jsonError(message, 500);
}

export async function GET(request: Request) {
  await connection();
  const { searchParams } = new URL(request.url);
  const wrld = searchParams.get('wrld');

  if (!wrld) {
    return jsonError('wrld parameter is required', 400);
  }

  const cleanWrld = wrld.trim();
  if (!VRCHAT_WORLD_ID_PATTERN.test(cleanWrld)) {
    return jsonError('Invalid wrld format (must be wrld_[A-Za-z0-9-]{1,64})', 400);
  }

  try {
    const html = await fetchVRChatWorldPage(cleanWrld);
    const payload = parseVRChatWorldInfoHtml(html, cleanWrld);
    if (!payload) {
      return jsonError('Could not extract world name from page', 404);
    }

    return jsonSuccess({ ...payload });
  } catch (error) {
    console.error('[vrc-world-info] Error:', error);
    return getErrorResponse(error, 'Failed to fetch VRChat world info');
  }
}

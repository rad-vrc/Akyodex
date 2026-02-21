import { jsonError, jsonSuccess } from '@/lib/api-helpers';
import { getAkyoData } from '@/lib/akyo-data';
import { isValidLanguage } from '@/lib/i18n';
import { connection } from 'next/server';

export const runtime = 'nodejs';
/**
 * GET /api/akyo-data?lang=ja|en|ko
 *
 * Centralized data endpoint for client language switching.
 * Always resolves through src/lib/akyo-data.ts (KV → JSON → CSV fallback).
 */
export async function GET(request: Request) {
  await connection();

  const { searchParams } = new URL(request.url);
  const langParam = searchParams.get('lang') ?? 'ja';

  if (!isValidLanguage(langParam)) {
    return jsonError('Invalid lang parameter', 400);
  }

  try {
    const lang = langParam;
    const data = await getAkyoData(lang);

    return jsonSuccess({
      data,
      lang,
      count: data.length,
    }, 200, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[api/akyo-data] Failed to fetch data:', error);
    return jsonError('Failed to load Akyo data', 500);
  }
}

import { jsonError, jsonSuccess } from '@/lib/api-helpers';
import { getAkyoData } from '@/lib/akyo-data';
import { isValidLanguage, type SupportedLanguage } from '@/lib/i18n';
import { connection } from 'next/server';

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
    const lang = langParam as SupportedLanguage;
    const data = await getAkyoData(lang);

    return jsonSuccess({
      data,
      lang,
      count: data.length,
    });
  } catch (error) {
    console.error('[api/akyo-data] Failed to fetch data:', error);
    return jsonError('Failed to load Akyo data', 500);
  }
}


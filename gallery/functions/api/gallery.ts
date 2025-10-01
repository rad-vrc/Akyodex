// gallery/functions/api/gallery.ts
import { okJSON, errJSON, corsHeaders } from '../_utils';
import type { PagesFunction } from '../types';

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request.headers.get('origin') ?? undefined) });
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 30;

    const indexKey = 'gallery:index';
    const allIds = await (env as any).AKYO_KV.get(indexKey, 'json') || [];

    const start = (page - 1) * limit;
    const pageIds = allIds.slice(start, start + limit);

    const items = await Promise.all(
      pageIds.map((id: string) => (env as any).AKYO_KV.get(`gallery:item:${id}`, 'json'))
    );

    return okJSON({
      items: items.filter(Boolean),
      hasMore: start + limit < allIds.length,
      total: allIds.length
    }, {
      headers: {
        ...corsHeaders(request.headers.get('origin') ?? undefined),
        'cache-control': 'public, max-age=300'
      }
    });
  } catch (e: any) {
    return errJSON(500, e?.message || 'gallery fetch failed');
  }
};


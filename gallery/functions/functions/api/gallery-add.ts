// functions/api/gallery-add.ts
import { corsHeaders, errJSON, okJSON, requireAuth } from "../_utils";
import type { PagesFunction } from "../types";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, {
    headers: corsHeaders(request.headers.get("origin") ?? undefined),
  });

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const role = requireAuth(request, env as any);

    const item = await request.json();
    const id = item.id || `gallery_${Date.now()}`;

    // KVに保存
    await (env as any).AKYO_KV.put(`gallery:item:${id}`, JSON.stringify(item));

    // インデックス更新
    const index =
      (await (env as any).AKYO_KV.get("gallery:index", "json")) || [];
    index.unshift(id);
    await (env as any).AKYO_KV.put("gallery:index", JSON.stringify(index));

    return okJSON(
      { ok: true, id },
      {
        headers: corsHeaders(request.headers.get("origin") ?? undefined),
      }
    );
  } catch (e: any) {
    if (e instanceof Response) return e;
    return errJSON(500, e?.message || "gallery add failed");
  }
};

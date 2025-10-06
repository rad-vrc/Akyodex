import { corsHeaders, errJSON, okJSON } from "../_utils";

// Cloudflare Pages Functions 用の型定義（TypeScript エラーを解消）
type PagesFunction = (context: {
  request: Request;
  env?: Record<string, any>;
  [key: string]: any;
}) => Promise<Response> | Response;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, {
    headers: corsHeaders(request.headers.get("origin") ?? undefined),
  });

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const list = await (env as any).AKYO_KV.list({ prefix: "akyo:" });
    const out: Record<string, string> = {};
    const values = await Promise.all(
      list.keys.map((k: any) => (env as any).AKYO_KV.get(k.name, "json"))
    );
    for (const v of values) {
      if (v?.id && v?.url) out[v.id] = v.url;
    }
    return okJSON(out, {
      headers: {
        ...corsHeaders(request.headers.get("origin") ?? undefined),
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (e: any) {
    return errJSON(500, e?.message || "manifest failed");
  }
};

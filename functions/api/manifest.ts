import { corsHeaders, errJSON, okJSON } from "../_utils";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const list = await (env as any).AKYO_KV.list({ prefix: "akyo:" });
    const out: Record<string, string> = {};
    const values = await Promise.all(list.keys.map((k: any) => (env as any).AKYO_KV.get(k.name, "json")));
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



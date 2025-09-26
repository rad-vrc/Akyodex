import { corsHeaders, errJSON } from "../_utils";

type PagesFunction = (context: { request: Request; env?: Record<string, any> }) => Promise<Response> | Response;

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const origin = request.headers.get("origin") ?? undefined;
  try {
    const owner = ((env as any).GITHUB_REPO_OWNER as string) || ((env as any).REPO_OWNER as string);
    const repo = ((env as any).GITHUB_REPO_NAME as string) || ((env as any).REPO_NAME as string);
    const branch = ((env as any).GITHUB_BRANCH as string) || "main";
    if (!owner || !repo) return errJSON(500, "GitHub settings missing");

    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/data/akyo-data.csv`;

    const upstream = await fetch(url, { cache: "no-store" });
    if (!upstream.ok) {
      return errJSON(502, `upstream failed: ${upstream.status}`);
    }
    const text = await upstream.text();
    return new Response(text, {
      headers: {
        ...corsHeaders(origin),
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate",
        pragma: "no-cache",
        expires: "0",
      },
      status: 200,
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return errJSON(500, e?.message || "csv proxy failed");
  }
};



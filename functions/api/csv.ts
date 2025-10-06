import { corsHeaders, errJSON } from "../_utils";

type PagesFunction = (context: {
  request: Request;
  env?: Record<string, any>;
}) => Promise<Response> | Response;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, {
    headers: corsHeaders(request.headers.get("origin") ?? undefined),
  });

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const origin = request.headers.get("origin") ?? undefined;
  try {
    const owner =
      ((env as any).GITHUB_REPO_OWNER as string) ||
      ((env as any).REPO_OWNER as string);
    const repo =
      ((env as any).GITHUB_REPO_NAME as string) ||
      ((env as any).REPO_NAME as string);
    const branch = ((env as any).GITHUB_BRANCH as string) || "main";
    if (!(owner && repo)) return errJSON(500, "GitHub settings missing");

    // 👇 クエリパラメータから言語とバージョンを取得
    const reqUrl = new URL(request.url);
    const lang = reqUrl.searchParams.get("lang") || "ja";
    const bust = reqUrl.searchParams.get("v") || String(Date.now());

    // 👇 言語別CSVファイル名を決定
    const csvFileName =
      lang === "ja" ? "akyo-data.csv" : `akyo-data-${lang}.csv`;
    let url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/data/${csvFileName}?bust=${encodeURIComponent(bust)}`;
    let usedFallback = false;

    // 👇 言語別CSVを取得
    let upstream = await fetch(url, {
      // Cloudflare キャッシュを確実に無効化
      cf: { cacheTtl: 0, cacheEverything: false },
      headers: { "cache-control": "no-cache", pragma: "no-cache" },
    } as RequestInit);

    // 👇 言語別CSVが見つからない場合は日本語版にフォールバック
    if (!upstream.ok && lang !== "ja") {
      console.log(
        `${lang} CSV not found (${upstream.status}), falling back to Japanese`
      );
      usedFallback = true;
      url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/data/akyo-data.csv?bust=${encodeURIComponent(bust)}`;

      upstream = await fetch(url, {
        cf: { cacheTtl: 0, cacheEverything: false },
        headers: { "cache-control": "no-cache", pragma: "no-cache" },
      } as RequestInit);
    }

    if (!upstream.ok) {
      return errJSON(502, `upstream failed: ${upstream.status}`);
    }

    const text = await upstream.text();
    const rowCount = (text.match(/^\d{3},/gm) || []).length;

    return new Response(text, {
      headers: {
        ...corsHeaders(origin),
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate",
        pragma: "no-cache",
        expires: "0",
        "x-akyo-row-count": String(rowCount),
        "x-akyo-source-url": url,
        "x-akyo-language": lang, // 👈 追加: 使用された言語
        "x-akyo-fallback": usedFallback ? "true" : "false", // 👈 追加: フォールバックフラグ
      },
      status: 200,
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return errJSON(500, e?.message || "csv proxy failed");
  }
};

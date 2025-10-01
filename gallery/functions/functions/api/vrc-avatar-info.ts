import { corsHeaders, errJSON, okJSON } from "../_utils";

// Cloudflare Pages Functions 型定義
type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  [key: string]: any;
}) => Promise<Response> | Response;

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const origin = request.headers.get("origin") ?? undefined;

  try {
    const url = new URL(request.url);
    const avtr = url.searchParams.get("avtr");

    if (!avtr || !/^avtr_[A-Za-z0-9-]+$/.test(avtr)) {
      return errJSON(400, "Invalid or missing 'avtr' parameter", { headers: corsHeaders(origin) });
    }

    // VRChatページをfetch
    const vrchatUrl = `https://vrchat.com/home/avatar/${avtr}`;
    const response = await fetch(vrchatUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      },
      // @ts-ignore - Cloudflare Workers の cf プロパティ
      cf: {
        cacheEverything: true,
        cacheTtl: 3600 // 1時間キャッシュ
      }
    });

    if (!response.ok) {
      return errJSON(response.status, `Failed to fetch VRChat page: ${response.status}`, { headers: corsHeaders(origin) });
    }

    const html = await response.text();

    // og:title または twitter:title からアバター名と作者名を抽出
    // フォーマット: "アバター名 by 作者名"
    const titleMatch = html.match(/<meta\s+name=["'](?:og:title|twitter:title)["']\s+content=["']([^"']+)["']/i);

    if (!titleMatch || !titleMatch[1]) {
      return errJSON(404, "Avatar title not found in VRChat page", { headers: corsHeaders(origin) });
    }

    const fullTitle = titleMatch[1];

    // " by " で分割してアバター名と作者名を抽出
    let avatarName = fullTitle;
    let creatorName = "";

    const byIndex = fullTitle.indexOf(" by ");
    if (byIndex !== -1) {
      avatarName = fullTitle.substring(0, byIndex).trim();
      creatorName = fullTitle.substring(byIndex + 4).trim();
    }

    // description も取得（あれば）
    const descMatch = html.match(/<meta\s+name=["'](?:description|og:description|twitter:description)["']\s+content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1] : "";

    return okJSON({
      avatarName,
      creatorName,
      description,
      fullTitle
    }, { headers: corsHeaders(origin) });

  } catch (error: any) {
    console.error("[vrc-avatar-info] Error:", error);
    return errJSON(500, `Internal error: ${error?.message || "Unknown"}`, { headers: corsHeaders(origin) });
  }
};
import { normalizeBaseUrl, rewriteEmbedScript } from "../dify/embed-shared";

export const onRequestGet = async ({ env }) => {
  const baseUrl = normalizeBaseUrl(
    (env.DIFY_CHATBOT_BASE_URL || "https://dexakyo.akyodex.com").trim()
  );
  const scriptUrl = `${baseUrl}/embed.min.js`;
  
  try {
    // キャッシュを回避して毎回取得
    const response = await fetch(scriptUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const script = await response.text();
    const rewritten = rewriteEmbedScript(script, baseUrl);

    return new Response(rewritten, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response('Failed to fetch Dify embed script', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
};

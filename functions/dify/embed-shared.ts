interface Env {
  DIFY_CHATBOT_BASE_URL?: string;
}

type PagesFunction<Bindings = any> = (context: {
  request: Request;
  env: Bindings;
  [key: string]: unknown;
}) => Promise<Response> | Response;

const RELATIVE_PATH_PATTERN = /(["'`])(\.{1,2}\/[^"'`]+)\1/g;
const SCRIPT_PATH = "embed.min.js";
const DEFAULT_HEADERS = {
  "content-type": "application/javascript",
} as const;

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const baseUrl = env.DIFY_CHATBOT_BASE_URL?.trim();

  if (!baseUrl) {
    return new Response("Missing DIFY_CHATBOT_BASE_URL", {
      status: 500,
      headers: DEFAULT_HEADERS,
    });
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${normalizedBaseUrl}/${SCRIPT_PATH}`);
  } catch (error) {
    console.error("[dify] Failed to fetch embed script", error);
    return new Response("Failed to fetch embed script", {
      status: 502,
      headers: DEFAULT_HEADERS,
    });
  }

  if (!upstreamResponse.ok) {
    return new Response("Failed to fetch embed script", {
      status: upstreamResponse.status,
      headers: DEFAULT_HEADERS,
    });
  }

  const scriptContent = await upstreamResponse.text();
  const rewritten = scriptContent.replace(
    RELATIVE_PATH_PATTERN,
    (match, quote: string, path: string) => {
      try {
        const absolute = new URL(path, `${normalizedBaseUrl}/`).toString();
        return `${quote}${absolute}${quote}`;
      } catch {
        return match;
      }
    }
  );

  return new Response(rewritten, {
    status: 200,
    headers: {
      ...DEFAULT_HEADERS,
      "cache-control": "public, max-age=300",
    },
  });
};

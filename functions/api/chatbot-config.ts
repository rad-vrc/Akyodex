import { okJSON } from "../_utils";

type Env = {
  DIFY_CHATBOT_TOKEN?: string;
  DIFY_CHATBOT_BASE_URL?: string;
};

type PagesFunction<Bindings = any> = (context: {
  request: Request;
  env: Bindings;
  [key: string]: unknown;
}) => Promise<Response> | Response;

const DEFAULT_EMBED_PROXY_REVISION = "20241009";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const token = env.DIFY_CHATBOT_TOKEN?.trim();
  const baseUrl = env.DIFY_CHATBOT_BASE_URL?.trim() || "https://dexakyo.akyodex.com";

  if (!token) {
    return okJSON({ enabled: false });
  }

  const scriptRevision = env.DIFY_EMBED_PROXY_REVISION?.trim();
  const revision = scriptRevision && scriptRevision.length > 0
    ? scriptRevision
    : DEFAULT_EMBED_PROXY_REVISION;

  // プロキシ経由でスクリプトを読み込み、クエリ文字列でキャッシュを無効化
  const scriptUrl = `/api/dify-embed-proxy?v=${encodeURIComponent(revision)}`;

  return okJSON({
    enabled: true,
    token,
    baseUrl,
    scriptUrl,
  });
};

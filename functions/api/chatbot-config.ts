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

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const token = env.DIFY_CHATBOT_TOKEN?.trim();
  const baseUrl = env.DIFY_CHATBOT_BASE_URL?.trim() || "https://dexakyo.akyodex.com";

  if (!token) {
    return okJSON({ enabled: false });
  }

  // プロキシ経由でスクリプトを読み込む
  const scriptUrl = "/api/dify-embed-proxy";

  return okJSON({
    enabled: true,
    token,
    baseUrl,
    scriptUrl,
  });
};

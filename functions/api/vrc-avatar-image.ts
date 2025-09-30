import AVATAR_ID_BY_AVTR from "../../data/akyo-avatar-map.js";
import { corsHeaders } from "../_utils";

const FALLBACK_R2_BASE = "https://images.akyodex.com";

// Cloudflare Pages Functions 用の型定義
type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  [key: string]: any;
}) => Promise<Response> | Response;

// KVNamespace 型定義
interface KVNamespace {
  get<T = string>(key: string, type?: "text" | "json" | "arrayBuffer" | "stream"): Promise<T | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<any>;
}

// 環境変数型定義
interface Env {
  AKYO_KV: KVNamespace;
  PUBLIC_R2_BASE: string;
}

interface KVRecord {
  id?: string;
  url?: string;
  key?: string;
}

// 型アサーション: 自動生成されたマップ
const avatarMap = AVATAR_ID_BY_AVTR as Record<string, string>;

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

function appendVersionParam(url: string, version: string): string {
  if (!version) return url;
  if (/[?&]v=/.test(url)) return url;
  const hashIndex = url.indexOf("#");
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${encodeURIComponent(version)}${hash}`;
}

async function resolveStoredImageUrl(id: string, env: Env): Promise<string | null> {
  if (!id) return null;
  const kv = env?.AKYO_KV;
  if (kv) {
    try {
      const record = await kv.get<KVRecord>(`akyo:${id}`, "json");
      if (!record) {
        console.info(`[vrc-avatar-image] No KV entry for id ${id}`);
        return null;
      }
      if (record?.url) return String(record.url);
      const key = record?.key ? String(record.key) : "";
      if (key) {
        const base = normalizeBaseUrl(env?.PUBLIC_R2_BASE) || FALLBACK_R2_BASE;
        if (base) return `${base}/${key}`;
      }
      console.warn(`[vrc-avatar-image] KV entry missing url for id ${id}`);
    } catch (error) {
      console.warn(`[vrc-avatar-image] KV lookup failed for id ${id}`, error);
    }
  } else {
    console.warn(`[vrc-avatar-image] KV binding missing; cannot resolve id ${id}`);
  }
  return null;
}

function sanitizeAvtr(avtr: string | null): string | null {
  if (!avtr) return null;
  const match = String(avtr).match(/avtr_[A-Za-z0-9-]+/);
  return match ? match[0] : null;
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin") ?? undefined),
  });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { searchParams } = new URL(request.url);
    const avtrRaw = searchParams.get("avtr") || "";
    let size = parseInt(searchParams.get("w") || "512", 10);
    const version = searchParams.get("v") || "";

    // サイズの正規化
    size = Math.max(32, Math.min(4096, Number.isFinite(size) ? size : 512));

    const avtrId = sanitizeAvtr(avtrRaw);
    if (!avtrId) {
      return new Response("Bad Request: Invalid avtr parameter", {
        status: 400,
        headers: corsHeaders(request.headers.get("origin") ?? undefined),
      });
    }

    // アバターID → AkyoID 逆引き
    const akyoId = avatarMap[avtrId.toLowerCase()];
    let storedUrl: string | null = null;

    // KVにR2画像URLが登録されていれば優先リダイレクト
    if (akyoId) {
      storedUrl = await resolveStoredImageUrl(akyoId, env);
      if (storedUrl) {
        const finalUrl = appendVersionParam(storedUrl, version);
        return Response.redirect(finalUrl, 302);
      }
    }

    // VRChatページからOGP画像を取得
    const pageUrl = `https://vrchat.com/home/avatar/${avtrId}`;
    const res = await fetch(pageUrl, {
      cf: { cacheEverything: true, cacheTtl: 21600 },
      headers: { "User-Agent": "AkyoZukan/1.0" },
    });

    if (!res.ok) {
      // VRChat APIエラー時、KV画像があればフォールバック
      if (storedUrl) {
        const finalUrl = appendVersionParam(storedUrl, version);
        return Response.redirect(finalUrl, 302);
      }
      return new Response("Upstream error: VRChat page not found", {
        status: 502,
        headers: corsHeaders(request.headers.get("origin") ?? undefined),
      });
    }

    const html = await res.text();

    // OGP画像URL抽出
    let img = "";
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (og?.[1]) img = og[1];

    // OGPが無い場合、直接画像URLを探す
    if (!img) {
      const hit = html.match(/https?:\/\/api\.vrchat\.cloud\/api\/1\/image\/(file_[A-Za-z0-9-]+)\/(\d+)\/(\d+)/i);
      if (hit) img = hit[0];
    }

    if (!img) {
      // 画像が見つからない場合、KV画像にフォールバック
      if (storedUrl) {
        const finalUrl = appendVersionParam(storedUrl, version);
        return Response.redirect(finalUrl, 302);
      }
      return new Response("Image not found in VRChat page", {
        status: 404,
        headers: corsHeaders(request.headers.get("origin") ?? undefined),
      });
    }

    // サイズパラメータの調整（URLの最後の数字を置換）
    img = img.replace(/\/(\d+)(?:\?.*)?$/, `/${size}`);
    const finalUrl = appendVersionParam(img, version);

    return Response.redirect(finalUrl, 302);
  } catch (error: any) {
    console.error("[vrc-avatar-image] Unexpected error:", error);
    return new Response(`Internal error: ${error?.message || "Unknown"}`, {
      status: 500,
      headers: corsHeaders(request.headers.get("origin") ?? undefined),
    });
  }
};
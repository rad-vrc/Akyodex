// functions/_utils.ts

// 型定義をインポート
export type { PagesFunction } from "./types";

export function okJSON(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
    status: init.status ?? 200,
  });
}

export function errJSON(status: number, message: string) {
  return okJSON({ error: message }, { status });
}

const ALLOWED_ORIGINS = new Set([
  "https://akyodex.com",
  "https://www.akyodex.com",
  "https://akyodex.pages.dev",
  "https://gallery.akyodex.com", // ← 追加
  "https://akyogallery.pages.dev", // ← 追加
]);

export function corsHeaders(origin?: string) {
  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET,POST,OPTIONS,DELETE",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-max-age": "600",
    vary: "Origin",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["access-control-allow-origin"] = origin;
  }

  return headers;
}

export function requireAuth(
  request: Request,
  env: { ADMIN_PASSWORD_OWNER: string; ADMIN_PASSWORD_ADMIN: string }
) {
  const h = request.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw new Response("Unauthorized", { status: 401 });
  if (token === env.ADMIN_PASSWORD_OWNER) return "owner" as const;
  if (token === env.ADMIN_PASSWORD_ADMIN) return "admin" as const;
  throw new Response("Unauthorized", { status: 401 });
}

export function threeDigits(id: string): string | null {
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  if (!trimmed) return null;
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  return trimmed.padStart(3, "0");
}

export function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
}

type SimpleKV = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: {
      expirationTtl?: number;
    }
  ): Promise<void>;
};

type RateLimitOptions = {
  prefix?: string;
  limit?: number;
  windowSeconds?: number;
  identifier?: string;
  kv?: SimpleKV;
};

function getClientIdentifier(request: Request) {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "anonymous";
}

export async function enforceRateLimit(
  request: Request,
  env: Record<string, unknown>,
  options: RateLimitOptions = {}
) {
  const kv =
    options.kv ??
    (env.RATE_LIMIT_KV as SimpleKV | undefined) ??
    (env.AKYO_KV as SimpleKV | undefined);
  if (!kv || typeof kv.get !== "function" || typeof kv.put !== "function")
    return;

  const limit = options.limit ?? 20;
  const windowSeconds = options.windowSeconds ?? 60;
  const identifier = options.identifier ?? getClientIdentifier(request);
  const key = `ratelimit:${options.prefix ?? "global"}:${identifier}`;

  const currentValue = await kv.get(key);
  const current = currentValue ? Number.parseInt(currentValue, 10) : 0;

  if (Number.isFinite(current) && current >= limit) {
    throw errJSON(429, "rate limit exceeded");
  }

  await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
}

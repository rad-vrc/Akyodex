// gallery/functions/_utils.ts

export type { PagesFunction } from './types';

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
  "https://gallery.akyodex.com",
  "https://akyogallery.pages.dev",
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

export function requireAuth(request: Request, env: { ADMIN_PASSWORD_OWNER: string; ADMIN_PASSWORD_ADMIN?: string }) {
  const h = request.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw new Response("Unauthorized", { status: 401 });
  if (token === env.ADMIN_PASSWORD_OWNER) return "owner" as const;
  if (env.ADMIN_PASSWORD_ADMIN && token === env.ADMIN_PASSWORD_ADMIN) return "admin" as const;
  throw new Response("Unauthorized", { status: 401 });
}


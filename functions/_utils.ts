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

export function corsHeaders(origin?: string) {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-methods": "GET,POST,OPTIONS,DELETE",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-max-age": "600",
  };
}

export function requireAuth(request: Request, env: { ADMIN_PASSWORD_OWNER: string; ADMIN_PASSWORD_ADMIN: string }) {
  const h = request.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw new Response("Unauthorized", { status: 401 });
  if (token === env.ADMIN_PASSWORD_OWNER) return "owner" as const;
  if (token === env.ADMIN_PASSWORD_ADMIN) return "admin" as const;
  throw new Response("Unauthorized", { status: 401 });
}

export function threeDigits(id: string) {
  return id?.trim().slice(0, 3).padStart(3, "0");
}

export function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
}



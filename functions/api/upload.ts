import {
  corsHeaders,
  enforceRateLimit,
  errJSON,
  okJSON,
  requireAuth,
  sanitizeFileName,
  threeDigits,
} from "../_utils";

const ALLOWED_MIME_TYPES = new Set(["image/webp"]);
const ALLOWED_EXTENSIONS = new Set([".webp"]);
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Cloudflare Pages Functions 用の型定義（TypeScript エラーを解消）
type PagesFunction = (context: {
  request: Request;
  env?: Record<string, any>;
  [key: string]: any;
}) => Promise<Response> | Response;

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const role = requireAuth(request, env as any); // "owner" | "admin"
    await enforceRateLimit(request, env as any, {
      prefix: `upload:${role}`,
      limit: role === "owner" ? 60 : 20,
      windowSeconds: 60,
    });
    const form = await request.formData();

    const idRaw = String(form.get("id") ?? "");
    const id = threeDigits(idRaw);
    if (!id) return errJSON(400, "invalid id");

    const file = form.get("file");
    if (!(file instanceof File)) return errJSON(400, "file is required");

    const original = file.name || `${id}.webp`;
    const safeName = sanitizeFileName(original);
    const extIndex = safeName.lastIndexOf(".");
    const ext = extIndex >= 0 ? safeName.slice(extIndex) : "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return errJSON(415, "unsupported file extension");
    }

    const mime = (file as any).type ? String((file as any).type).toLowerCase() : "";
    if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
      return errJSON(415, "unsupported mime type");
    }

    const maxSize = Number((env as any).MAX_UPLOAD_SIZE_BYTES ?? DEFAULT_MAX_SIZE);
    if (Number.isFinite(maxSize) && file.size > maxSize) {
      return errJSON(413, "file too large");
    }

    const key = `${id}.webp`;

    await (env as any).AKYO_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: mime || "application/octet-stream",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    const baseRaw = (env as any).PUBLIC_R2_BASE as string | undefined;
    const base = typeof baseRaw === "string" ? baseRaw.replace(/\/+$/, "") : "";
    const url = base ? `${base}/${key}` : key;

    // メタデータ（最小）
    const name = String(form.get("name") ?? "");
    const type = String(form.get("type") ?? "");
    const desc = String(form.get("desc") ?? "");
    const now = new Date().toISOString();
    const updater = role; // ロールのみ記録（必要ならIP/UAも）

    const data = { id, name, type, desc, key, url, updatedAt: now, updater };
    await (env as any).AKYO_KV.put(`akyo:${id}`, JSON.stringify(data));

    return okJSON(
      { ok: true, id, url, key, updatedAt: now },
      { headers: corsHeaders(request.headers.get("origin") ?? undefined) }
    );
  } catch (e: any) {
    if (e instanceof Response) return e;
    return errJSON(500, e?.message || "upload failed");
  }
};

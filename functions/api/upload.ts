import {
  corsHeaders,
  enforceRateLimit,
  errJSON,
  okJSON,
  requireAuth,
  sanitizeFileName,
  threeDigits,
} from "../_utils";

const ALLOWED_MIME_TYPES = new Set([
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);
const ALLOWED_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg"]);
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Cloudflare Pages Functions 用の型定義（TypeScript エラーを解消）
type PagesFunction = (context: {
  request: Request;
  env?: Record<string, unknown>;
  [key: string]: unknown;
}) => Promise<Response> | Response;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, {
    headers: corsHeaders(request.headers.get("origin") ?? undefined),
  });


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
    const dataUrl = form.get("dataUrl");

    const parsed = normalizeUploadPayload(id, file, dataUrl);
    if (parsed.error) return parsed.error;

    const { safeName, mime, body, size } = parsed;

    const maxSize = Number(
      (env as any).MAX_UPLOAD_SIZE_BYTES ?? DEFAULT_MAX_SIZE
    );
    if (Number.isFinite(maxSize) && size > maxSize) {
      return errJSON(413, "file too large");
    }

    const version = Date.now().toString(36);
    const key = `images/${id}_${version}_${safeName}`; // 実ファイル名は自由だが先頭3桁IDで揃える

    await (env as any).AKYO_BUCKET.put(key, body, {
      httpMetadata: {
        contentType: mime || "application/octet-stream",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    const base = (env as any).PUBLIC_R2_BASE as string; // 例: https://images.akyodex.com
    const url = `${base}/${key}`;

    // メタデータ（最小）
    const name = String(form.get("name") ?? "");
    const type = String(form.get("type") ?? "");
    const desc = String(form.get("desc") ?? "");
    const now = new Date().toISOString();
    const updater = role; // ロールのみ記録（必要ならIP/UAも）

    const data = {
      id,
      name,
      type,
      desc,
      key,
      url,
      updatedAt: now,
      updater,
      version,
    };
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

function normalizeUploadPayload(
  id: string,
  file: FormDataEntryValue | null,
  dataUrl: FormDataEntryValue | null
):
  | {
      safeName: string;
      mime: string;
      body: ReadableStream | ArrayBuffer | Uint8Array;
      size: number;
      error?: undefined;
    }
  | { error: Response } {
  if (file instanceof File && file.size > 0) {
    const original = file.name || `${id}.webp`;
    const safeName = sanitizeFileName(original);
    const ext = getExtension(safeName);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { error: errJSON(415, "unsupported file extension") };
    }

    const mime = file.type ? String(file.type).toLowerCase() : "";
    if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
      return { error: errJSON(415, "unsupported mime type") };
    }

    return {
      safeName,
      mime,
      body: file.stream(),
      size: file.size,
    };
  }

  if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return { error: errJSON(400, "invalid data url") };
    }

    const ext = mimeToExtension(parsed.mime);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { error: errJSON(415, "unsupported file extension") };
    }
    if (parsed.mime && !ALLOWED_MIME_TYPES.has(parsed.mime)) {
      return { error: errJSON(415, "unsupported mime type") };
    }

    const safeName = sanitizeFileName(`${id}${ext}`);

    return {
      safeName,
      mime: parsed.mime,
      body: parsed.bytes,
      size: parsed.bytes.byteLength,
    };
  }

  return { error: errJSON(400, "file is required") };
}

function getExtension(name: string) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx) : "";
}

function mimeToExtension(mime: string) {
  const lower = mime?.toLowerCase() ?? "";
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("png")) return ".png";
  if (lower.includes("jpeg") || lower.includes("jpg")) return ".jpg";
  return ".webp";
}

function parseDataUrl(
  dataUrl: string
): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(dataUrl);
  if (!match) return null;
  const mime = (match[1] || "image/webp").toLowerCase();
  const isBase64 = !!match[2];
  const data = match[3] || "";
  try {
    if (isBase64) {
      const binary = atob(data);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return { mime, bytes };
    }
    const decoded = decodeURIComponent(data);
    return { mime, bytes: new TextEncoder().encode(decoded) };
  } catch (e) {
    return null;
  }
}

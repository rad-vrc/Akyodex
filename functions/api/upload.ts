import { corsHeaders, errJSON, okJSON, requireAuth, sanitizeFileName, threeDigits } from "../_utils";

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
    const form = await request.formData();

    const idRaw = String(form.get("id") ?? "");
    const id = threeDigits(idRaw);
    if (!id) return errJSON(400, "invalid id");

    const file = form.get("file");
    if (!(file instanceof File)) return errJSON(400, "file is required");

    const original = file.name || `${id}.webp`;
    const safeName = sanitizeFileName(original);
    const key = `images/${id}_${safeName}`; // 実ファイル名は自由だが先頭3桁IDで揃える

    await (env as any).AKYO_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: (file as any).type || "application/octet-stream",
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



// functions/api/delete-image.ts
import { threeDigits } from "../_utils";

type PagesFunctionContext = {
  request: Request;
  env: Record<string, unknown> & {
    AKYO_BUCKET: {
      delete(key: string): Promise<void>;
      list(options: { prefix: string; cursor?: string }): Promise<{
        objects?: Array<{ key: string }>;
        truncated?: boolean;
        cursor?: string;
      }>;
    };
    AKYO_KV: {
      delete(key: string): Promise<void>;
    };
  };
  [key: string]: unknown;
};

type PagesFunction = (ctx: PagesFunctionContext) => Promise<Response> | Response;

export const onRequestDelete: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get("id");
  return handleDelete(ctx, id);
};

export const onRequestPost: PagesFunction = async (ctx) => {
  let id: unknown = null;
  try {
    const payload = await ctx.request.json();
    id = (payload as { id?: unknown })?.id ?? null;
  } catch (_) {}
  if (!id) {
    const url = new URL(ctx.request.url);
    id = url.searchParams.get("id");
  }
  return handleDelete(ctx, id);
};

async function handleDelete(ctx: PagesFunctionContext, idRaw: unknown) {
  const id = threeDigits(String(idRaw ?? ""));
  if (!id) return json({ ok: false, error: "invalid id" }, 400);

  try {
    const bucket = ctx.env.AKYO_BUCKET;
    let deleted = 0;

    // 旧来の {id}.webp 形式も念のため削除
    try {
      await bucket.delete(`${id}.webp`);
      deleted++;
    } catch (_) {}

    // 新形式 images/{id}_... をまとめて削除
    let cursor = undefined;
    do {
      const listResult = await bucket.list({ prefix: `images/${id}`, cursor });
      for (const obj of listResult?.objects ?? []) {
        await bucket.delete(obj.key);
        deleted++;
      }
      cursor = listResult?.truncated ? listResult?.cursor : undefined;
    } while (cursor);

    // マニフェスト（KV）からも削除
    await ctx.env.AKYO_KV.delete(`akyo:${id}`);

    return json({ ok: true, deleted });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

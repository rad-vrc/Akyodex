// functions/api/delete-image.js
export const onRequestDelete = async (ctx) => {
    const url = new URL(ctx.request.url);
    const id = url.searchParams.get('id');
    return handleDelete(ctx, id);
  };

  export const onRequestPost = async (ctx) => {
    let id = null;
    try { id = (await ctx.request.json()).id; } catch (_) {}
    if (!id) {
      const url = new URL(ctx.request.url);
      id = url.searchParams.get('id');
    }
    return handleDelete(ctx, id);
  };

  async function handleDelete(ctx, id) {
    if (!id) return json({ ok: false, error: 'missing id' }, 400);
    // 認可チェック（Bearer ...）をここで
    const key = `${id}.webp`; // あなたの命名規則に合わせて
    try {
      await ctx.env.AKYO_BUCKET.delete(key);
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: String(e) }, 500);
    }
  }
  function json(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers: { 'content-type':'application/json' }}); }

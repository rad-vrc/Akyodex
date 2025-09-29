export async function onRequestGet({ request }) {
    const { searchParams } = new URL(request.url);
    let avtr = searchParams.get('avtr') || '';
    let size = parseInt(searchParams.get('w') || '512', 10);
    size = Math.max(32, Math.min(4096, isFinite(size) ? size : 512));

    const m = avtr.match(/avtr_[A-Za-z0-9-]+/);
    if (!m) return new Response('Bad Request', { status: 400 });
    const avtrId = m[0];

    const pageUrl = `https://vrchat.com/home/avatar/${avtrId}`;
    const res = await fetch(pageUrl, {
      cf: { cacheEverything: true, cacheTtl: 21600 }, // 6h
      headers: { 'User-Agent': 'AkyoZukan/1.0' },
    });
    if (!res.ok) return new Response('Upstream error', { status: 502 });

    const html = await res.text();

    // 1) og:image を優先して拾う
    let img = '';
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (og?.[1]) img = og[1];

    // 2) フォールバック: HTML中の最初の file_ URL
    if (!img) {
      const hit = html.match(/https?:\/\/api\.vrchat\.cloud\/api\/1\/image\/(file_[A-Za-z0-9-]+)\/(\d+)\/(\d+)/i);
      if (hit) img = hit[0];
    }

    if (!img) return new Response('Image not found', { status: 404 });

    // 末尾のサイズを置き換え（/1024 → /<size>）
    img = img.replace(/\/(\d+)(?:\?.*)?$/, `/${size}`);

    // そのままリダイレクト
    return Response.redirect(img, 302);
  }

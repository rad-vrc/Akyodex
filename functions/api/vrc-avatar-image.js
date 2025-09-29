import AVATAR_ID_BY_AVTR from "../../data/akyo-avatar-map.js";

const FALLBACK_R2_BASE = "https://images.akyodex.com";

function normalizeBaseUrl(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

function appendVersionParam(url, version) {
  if (!version) return url;
  if (/[?&]v=/.test(url)) return url;
  const hashIndex = url.indexOf("#");
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${encodeURIComponent(version)}${hash}`;
}

async function resolveStoredImageUrl(id, env) {
  if (!id) return null;
  const kv = env?.AKYO_KV;
  if (kv) {
    try {
      const record = await kv.get(`akyo:${id}`, "json");
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

function sanitizeAvtr(avtr) {
  if (!avtr) return null;
  const match = String(avtr).match(/avtr_[A-Za-z0-9-]+/);
  return match ? match[0] : null;
}

export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  let avtr = searchParams.get("avtr") || "";
  let size = parseInt(searchParams.get("w") || "512", 10);
  const version = searchParams.get("v") || "";
  size = Math.max(32, Math.min(4096, Number.isFinite(size) ? size : 512));

  const avtrId = sanitizeAvtr(avtr);
  if (!avtrId) return new Response("Bad Request", { status: 400 });

  const akyoId = AVATAR_ID_BY_AVTR[avtrId.toLowerCase()];
  let storedUrl = null;
  if (akyoId) {
    storedUrl = await resolveStoredImageUrl(akyoId, env);
    if (storedUrl) {
      const finalUrl = appendVersionParam(storedUrl, version);
      return Response.redirect(finalUrl, 302);
    }
  }

  const pageUrl = `https://vrchat.com/home/avatar/${avtrId}`;
  const res = await fetch(pageUrl, {
    cf: { cacheEverything: true, cacheTtl: 21600 },
    headers: { "User-Agent": "AkyoZukan/1.0" },
  });

  if (!res.ok) {
    if (storedUrl) {
      const finalUrl = appendVersionParam(storedUrl, version);
      return Response.redirect(finalUrl, 302);
    }
    return new Response("Upstream error", { status: 502 });
  }

  const html = await res.text();

  let img = "";
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) img = og[1];

  if (!img) {
    const hit = html.match(/https?:\/\/api\.vrchat\.cloud\/api\/1\/image\/(file_[A-Za-z0-9-]+)\/(\d+)\/(\d+)/i);
    if (hit) img = hit[0];
  }

  if (!img) {
    if (storedUrl) {
      const finalUrl = appendVersionParam(storedUrl, version);
      return Response.redirect(finalUrl, 302);
    }
    return new Response("Image not found", { status: 404 });
  }

  img = img.replace(/\/(\d+)(?:\?.*)?$/, `/${size}`);
  const finalUrl = appendVersionParam(img, version);
  return Response.redirect(finalUrl, 302);
}

import { corsHeaders, enforceRateLimit, errJSON, okJSON, requireAuth } from "../_utils";

type Choice = {
  key: string;
  extScore: number;
  dirScore: number;
  posScore: number;
};

function pickBetter(a: Choice | undefined, b: Choice): Choice {
  if (!a) return b;
  if (b.extScore !== a.extScore) return b.extScore > a.extScore ? b : a;
  if (b.dirScore !== a.dirScore) return b.dirScore > a.dirScore ? b : a;
  if (b.posScore !== a.posScore) return b.posScore > a.posScore ? b : a;
  // 最後にキーの短さを優先
  return b.key.length < a.key.length ? b : a;
}

function extractIdAndScore(key: string): { id: string | null; dirScore: number; posScore: number } {
  const base = key.split("/").pop() || key;
  const m = base.match(/(\d{3})/);
  const id = m ? m[1] : null;
  const dirScore = key.startsWith("images/") ? 1 : 0;
  const posScore = base.startsWith(id || "_") ? 2 : (m ? 1 : 0);
  return { id, dirScore, posScore };
}

export const onRequestOptions = async ({ request }: any) => {
  return new Response(null, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
};

// 管理者専用: R2を走査して 3桁ID => 実キー をKVへ再構築
export const onRequestPost = async ({ request, env }: any) => {
  try {
    // 認証（owner/admin）
    requireAuth(request, env as any);
    await enforceRateLimit(request, env as any, {
      prefix: "scan",
      limit: 5,
      windowSeconds: 300,
    });

    const bucket = (env as any).AKYO_BUCKET;
    const kv = (env as any).AKYO_KV;
    const base = (env as any).PUBLIC_R2_BASE as string; // 例: https://images.akyodex.com

    const extScore = (ext: string) => (ext === "webp" ? 3 : ext === "png" ? 2 : /jpe?g/i.test(ext) ? 1 : 0);

    const best: Record<string, Choice> = {};

    let cursor: string | undefined = undefined;
    do {
      const list = await bucket.list({ prefix: "", cursor, limit: 1000 });
      cursor = list.cursor;
      for (const obj of list.objects) {
        const key = obj.key;
        const m = key.match(/\.([A-Za-z0-9]+)$/);
        const ext = (m ? m[1].toLowerCase() : "");
        if (!/(webp|png|jpg|jpeg)$/i.test(ext)) continue;
        const { id, dirScore, posScore } = extractIdAndScore(key);
        if (!id) continue;
        const cand: Choice = { key, extScore: extScore(ext), dirScore, posScore };
        best[id] = pickBetter(best[id], cand);
      }
    } while (cursor);

    const now = new Date().toISOString();
    const map: Record<string, string> = {};
    let updated = 0;
    for (const [id, choice] of Object.entries(best)) {
      const url = `${base}/${choice.key}`;
      map[id] = url;
      await kv.put(`akyo:${id}`, JSON.stringify({ id, key: choice.key, url, updatedAt: now, source: "scan" }));
      updated++;
    }

    return okJSON(
      { ok: true, count: updated, map },
      { headers: corsHeaders(request.headers.get("origin") ?? undefined) }
    );
  } catch (e: any) {
    if (e instanceof Response) return e;
    return errJSON(500, e?.message || "scan failed");
  }
};



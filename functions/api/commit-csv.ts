import { corsHeaders, enforceRateLimit, errJSON, okJSON, requireAuth } from "../_utils";

// Cloudflare Pages Functions 型
type PagesFunction = (context: {
  request: Request;
  env?: Record<string, any>;
  [key: string]: any;
}) => Promise<Response> | Response;

async function githubFetch(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  const url = `https://api.github.com${path}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json; charset=utf-8",
    ...(init.headers as Record<string, string> | undefined),
  } as Record<string, string>;
  return fetch(url, { ...init, headers });
}

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const origin = request.headers.get("origin") ?? undefined;
  try {
    // 認証とレート制限
    const role = requireAuth(request, env as any);
    await enforceRateLimit(request, env as any, {
      prefix: `commit-csv:${role}`,
      limit: role === "owner" ? 30 : 10,
      windowSeconds: 60,
    });

    const token = (env as any).GITHUB_TOKEN as string;
    const owner = ((env as any).GITHUB_REPO_OWNER as string) || ((env as any).REPO_OWNER as string);
    const repo = ((env as any).GITHUB_REPO_NAME as string) || ((env as any).REPO_NAME as string);
    const branch = ((env as any).GITHUB_BRANCH as string) || "main";
    if (!token || !owner || !repo) {
      return errJSON(500, "GitHub settings missing");
    }

    // CSV本文
    const csvText = await request.text();
    if (!csvText || csvText.length < 5) {
      return errJSON(400, "csv body required");
    }

    // base64（UTF-8 対応）
    const base64Content = btoa(unescape(encodeURIComponent(csvText)));

    const path = `data/akyo-data.csv`;

    // sha 取得関数
    async function getCurrentSha(): Promise<string | undefined> {
      const res = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`, token);
      if (!res.ok) return undefined;
      const json = await res.json();
      return json?.sha as string | undefined;
    }

    // 競合時リトライ
    let attempt = 0;
    const maxAttempts = 3;
    let lastErrorText = "";
    while (attempt < maxAttempts) {
      attempt++;
      const sha = await getCurrentSha();
      const putRes = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, token, {
        method: "PUT",
        body: JSON.stringify({
          message: `chore: update akyo-data.csv (via API)` ,
          content: base64Content,
          branch,
          // 既存が無ければ sha 省略で新規作成
          ...(sha ? { sha } : {}),
        }),
      });

      if (putRes.ok) {
        return okJSON({ ok: true, committed: true, attempt }, { headers: corsHeaders(origin) });
      }

      const status = putRes.status;
      lastErrorText = await putRes.text();
      // 409/422 は競合・検証エラー。再取得→再試行
      if (status === 409 || status === 422) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
        continue;
      }

      // その他は即エラー
      return errJSON(500, `github update failed: ${status} ${lastErrorText}`);
    }

    return errJSON(500, `github update failed after retries: ${lastErrorText || "conflict"}`);
  } catch (e: any) {
    if (e instanceof Response) return e;
    return errJSON(500, e?.message || "commit-csv failed");
  }
};



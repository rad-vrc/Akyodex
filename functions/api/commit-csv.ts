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
    "user-agent": "Akyodex-Worker/1.0",
    "x-github-api-version": "2022-11-28",
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

    const path = `data/akyo-data.csv`;

    // 現行CSVの取得（shaと本文）
    async function getCurrentBase(): Promise<{ sha?: string; text: string; eol: "\n" | "\r\n" }> {
      const res = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`, token);
      if (!res.ok) return { sha: undefined, text: "", eol: "\n" };
      const json = await res.json();
      const sha = json?.sha as string | undefined;
      let text = "";
      try {
        const raw = json?.content ? String(json.content).replace(/\n/g, "") : "";
        text = decodeURIComponent(escape(atob(raw)));
      } catch (_) {
        text = "";
      }
      const eol = text.includes("\r\n") ? "\r\n" : "\n";
      return { sha, text, eol };
    }

    // 旧→新の最小差分で組み立て
    function splitLinesPreserve(text: string): string[] {
      if (!text) return [];
      return text.replace(/\r\n/g, "\n").split("\n");
    }

    function isHeader(line: string): boolean {
      return /^\s*ID\s*,/i.test(line) || /^\s*,?\s*見た目,/.test(line);
    }

    function parseFirstField(line: string): string | null {
      if (!line) return null;
      let i = 0; const n = line.length;
      // handle optional BOM
      if (line.charCodeAt(0) === 0xFEFF) i = 1;
      if (i >= n) return null;
      if (line[i] === '"') {
        i++; let field = "";
        while (i < n) {
          const ch = line[i];
          if (ch === '"') {
            if (i + 1 < n && line[i + 1] === '"') { field += '"'; i += 2; continue; }
            // end quote
            i++;
            // next should be comma or end
            return field;
          } else { field += ch; i++; }
        }
        return field || null;
      } else {
        const j = line.indexOf(',');
        return (j >= 0 ? line.slice(0, j) : line).trim() || null;
      }
    }

    function csvQuote(val: string): string {
      const needs = /[",\n\r]/.test(val);
      const body = val.replace(/"/g, '""');
      return needs ? `"${body}"` : body;
    }

    function buildLineFromArray(arr: string[]): string {
      return arr.map(csvQuote).join(',');
    }

    function parseCsvToRows(text: string): { header?: string; rows: Array<{ id: string; raw: string; fields?: string[] }> } {
      const lines = splitLinesPreserve(text);
      const out: Array<{ id: string; raw: string; fields?: string[] }> = [];
      let header: string | undefined;
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        if (!line) continue;
        if (!header && isHeader(line)) { header = line; continue; }
        const id = (parseFirstField(line) || '').trim();
        if (!id || !/^\d{3}$/.test(id)) continue;
        out.push({ id, raw: line });
      }
      return { header, rows: out };
    }

    function parseCsvToMap(text: string): Map<string, string> {
      const { rows } = parseCsvToRows(text);
      const m = new Map<string, string>();
      rows.forEach(r => m.set(r.id, r.raw));
      return m;
    }

    // 新CSVのID→行データ
    const newMap = parseCsvToMap(csvText);
    const newOrder = Array.from(newMap.keys());

    // 旧CSV取得
    const { sha: baseSha, text: baseText, eol } = await getCurrentBase();
    const baseParsed = parseCsvToRows(baseText);
    const baseMap = new Map<string, string>();
    baseParsed.rows.forEach(r => baseMap.set(r.id, r.raw));

    // headerは既存優先→新CSVの先頭行がヘッダならそれ→デフォルト
    let header = baseParsed.header;
    if (!header) {
      const firstLine = splitLinesPreserve(csvText).find(l => !!l);
      if (firstLine && isHeader(firstLine)) header = firstLine;
    }
    if (!header) header = 'ID,見た目,通称,アバター名,属性（モチーフが基準）,備考,作者（敬称略）,アバターURL';

    // 旧順序を基準に差し替え、無いIDはスキップ、削除は落ちる
    const changed: string[] = [];
    const keptOrderLines: string[] = [];
    for (const r of baseParsed.rows) {
      const id = r.id;
      if (newMap.has(id)) {
        const newLine = newMap.get(id)!;
        if (newLine !== r.raw) changed.push(id);
        keptOrderLines.push(newLine);
        newMap.delete(id); // 消費
      } else {
        // 削除
        changed.push(id);
        // 何もpushしない
      }
    }

    // 追加（旧に無いID）は新CSVの順で末尾へ
    const addedIds = Array.from(newMap.keys());
    const addedLines = addedIds.map(id => newMap.get(id)!).filter(Boolean);
    const allLines = [header, ...keptOrderLines, ...addedLines].filter(Boolean) as string[];
    const newBody = allLines.join(eol) + eol;

    // コミット
    const base64Content = btoa(unescape(encodeURIComponent(newBody)));

    // 競合時リトライ
    let attempt = 0;
    const maxAttempts = 3;
    let lastErrorText = "";
    while (attempt < maxAttempts) {
      attempt++;
      const sha = baseSha;
      const putRes = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, token, {
        method: "PUT",
        body: JSON.stringify({
          message: `chore: update akyo-data.csv (via API)\nchanged: ${changed.join(', ')}\nadded: ${addedIds.join(', ')}` ,
          content: base64Content,
          branch,
          // 既存が無ければ sha 省略で新規作成
          ...(sha ? { sha } : {}),
        }),
      });

      if (putRes.ok) {
        let payload: any = null;
        try { payload = await putRes.json(); } catch (_) {}
        const commitSha = payload?.commit?.sha as string | undefined;
        const contentSha = payload?.content?.sha as string | undefined;
        const fileHtmlUrl = payload?.content?.html_url as string | undefined;
        const commitUrl = commitSha ? `https://github.com/${owner}/${repo}/commit/${commitSha}` : undefined;
        return okJSON({
          ok: true,
          committed: true,
          attempt,
          owner,
          repo,
          branch,
          path,
          commitSha,
          contentSha,
          commitUrl,
          fileHtmlUrl,
        }, { headers: corsHeaders(origin) });
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



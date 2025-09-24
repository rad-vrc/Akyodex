import { corsHeaders, errJSON, okJSON, requireAuth, sanitizeFileName, threeDigits } from "../_utils";

interface GithubCommitResponse {
  content?: { sha: string };
  commit?: { sha: string };
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let chunkBinary = "";
    for (let j = 0; j < chunk.length; j++) {
      chunkBinary += String.fromCharCode(chunk[j]);
    }
    binary += chunkBinary;
  }
  return btoa(binary);
}

async function githubFetch(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  const url = `https://api.github.com${path}`;
  const headers = {
    "authorization": `Bearer ${token}`,
    "accept": "application/vnd.github+json",
    "content-type": "application/json; charset=utf-8",
    ...init.headers,
  } as Record<string, string>;
  return fetch(url, { ...init, headers });
}

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    // 認証（Akyoワード）
    requireAuth(request, env as any);

    const token = (env as any).GITHUB_TOKEN as string;
    const owner = ((env as any).GITHUB_REPO_OWNER as string) || ((env as any).REPO_OWNER as string);
    const repo = ((env as any).GITHUB_REPO_NAME as string) || ((env as any).REPO_NAME as string);
    const branch = ((env as any).GITHUB_BRANCH as string) || "main";
    if (!token || !owner || !repo) return errJSON(500, "GitHub settings missing");

    const form = await request.formData();
    const idRaw = String(form.get("id") ?? "");
    const id = threeDigits(idRaw);
    if (!id) return errJSON(400, "invalid id");

    const file = form.get("file");
    if (!(file instanceof File)) return errJSON(400, "file is required");

    // ファイル名決定（拡張子は入力に合わせる）
    const original = file.name || `${id}.bin`;
    const safeNameOnly = sanitizeFileName(original).replace(/^\.+/, "");
    const key = `images/${id}_${safeNameOnly}`;

    // GitHubへファイルをPUT
    const arrayBuffer = await file.arrayBuffer();
    const base64Content = arrayBufferToBase64(arrayBuffer);
    const putFileRes = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(key)}`, token, {
      method: "PUT",
      body: JSON.stringify({
        message: `chore: add image ${key}`,
        content: base64Content,
        branch,
      }),
    });
    if (!putFileRes.ok) {
      const txt = await putFileRes.text();
      return errJSON(500, `github upload failed: ${putFileRes.status} ${txt}`);
    }

    // manifest.json 更新（存在しなければ新規作成）
    const manifestPath = `images/manifest.json`;
    let manifestSha: string | undefined;
    let manifest: any = { map: {} };
    const getManRes = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(manifestPath)}?ref=${encodeURIComponent(branch)}`, token);
    if (getManRes.ok) {
      const json = await getManRes.json();
      manifestSha = json.sha;
      const content = atob(json.content.replace(/\n/g, ""));
      try { manifest = JSON.parse(content) || { map: {} }; } catch (_) { manifest = { map: {} }; }
    }

    // mapにフル/相対パスを格納（相対: images/...）
    if (!manifest.map || typeof manifest.map !== "object") manifest.map = {};
    manifest.map[id] = key; // 例: images/001_foo.jpg

    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(manifest, null, 2))));
    const putManRes = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(manifestPath)}`, token, {
      method: "PUT",
      body: JSON.stringify({
        message: `chore: update manifest for ${id}`,
        content: newContent,
        branch,
        sha: manifestSha,
      }),
    });
    if (!putManRes.ok) {
      const txt = await putManRes.text();
      return errJSON(500, `github manifest update failed: ${putManRes.status} ${txt}`);
    }

    return okJSON({ ok: true, id, key, manifestUpdated: true }, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return errJSON(500, e?.message || "gh-upload failed");
  }
};



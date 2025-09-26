import {
  corsHeaders,
  enforceRateLimit,
  errJSON,
  okJSON,
  requireAuth,
  sanitizeFileName,
  threeDigits,
} from "../_utils";

const ALLOWED_MIME_TYPES = new Set(["image/webp", "image/png", "image/jpeg"]);
const ALLOWED_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg"]);
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Cloudflare Pages Functions 用の型定義（TypeScript エラーを解消）
type PagesFunction = (context: {
  request: Request;
  env?: Record<string, any>;
  [key: string]: any;
}) => Promise<Response> | Response;

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
    const role = requireAuth(request, env as any);
    await enforceRateLimit(request, env as any, {
      prefix: `gh-upload:${role}`,
      limit: role === "owner" ? 60 : 20,
      windowSeconds: 60,
    });

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

    const originalName = file.name || `${id}.webp`;
    const safeNameFull = sanitizeFileName(originalName);
    const extIndex = safeNameFull.lastIndexOf(".");
    const ext = extIndex >= 0 ? safeNameFull.slice(extIndex) : "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return errJSON(415, "unsupported file extension");
    }

    const mime = (file as any).type ? String((file as any).type).toLowerCase() : "";
    if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
      return errJSON(415, "unsupported mime type");
    }

    const maxSize = Number((env as any).MAX_UPLOAD_SIZE_BYTES ?? DEFAULT_MAX_SIZE);
    if (Number.isFinite(maxSize) && file.size > maxSize) {
      return errJSON(413, "file too large");
    }

    // ファイル名決定（拡張子は入力に合わせる）
    const safeNameOnly = safeNameFull.replace(/^\.+/, "");
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



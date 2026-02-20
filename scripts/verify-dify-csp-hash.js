#!/usr/bin/env node

const fs = require('fs/promises');
const { createHash } = require('crypto');

const MIDDLEWARE_PATH = 'src/middleware.ts';
// Public fallback token used by the frontend embed as well (not a secret).
// Keep DEFAULT_DIFY_TOKEN in sync when rotating the Dify chatbot instance token.
const DEFAULT_DIFY_TOKEN = 'bJthPu2B6Jf4AnsU';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

function computeSha256Base64(content) {
  return createHash('sha256').update(content).digest('base64');
}

function extractConfiguredHash(middlewareSource) {
  // Extract all CSP hashes from the middleware source.
  // This matches 'sha256-...' strings regardless of the directive structure.
  // NOTE: This global search assumes exactly one hash exists in the middleware.
  // If more hashes are added to other directives in the future, this regex
  // should be refined to scope the search specifically to script-src.
  const hashMatches = [...middlewareSource.matchAll(/'sha256-([^']+)'/g)].map((match) => match[1]);

  if (hashMatches.length === 0) {
    throw new Error(`sha256 hash is not configured in ${MIDDLEWARE_PATH}`);
  }

  if (hashMatches.length !== 1) {
    throw new Error(
      `Expected exactly one sha256 hash in ${MIDDLEWARE_PATH}, but found ${hashMatches.length}: ${hashMatches.join(', ')}`
    );
  }

  return hashMatches[0];
}

function collectInlineScriptHashes(html) {
  const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi)];
  const nonEmptyScripts = scriptMatches.map((match) => match[1]).filter((code) => code.trim().length > 0);
  return [...new Set(nonEmptyScripts.map((code) => computeSha256Base64(code)))];
}

async function fetchHtmlWithRetry(url) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'user-agent': 'Akyodex-CSP-Hash-Check/1.0',
          accept: 'text/html',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  throw new Error(
    `Failed to fetch Dify chatbot page after ${MAX_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

async function main() {
  const middlewareSource = await fs.readFile(MIDDLEWARE_PATH, 'utf8');
  const configuredHash = extractConfiguredHash(middlewareSource);

  const token =
    process.env.DIFY_CSP_HASH_CHECK_TOKEN ||
    process.env.NEXT_PUBLIC_DIFY_CHATBOT_TOKEN ||
    DEFAULT_DIFY_TOKEN;
  const targetUrl = `https://udify.app/chatbot/${token}`;

  const html = await fetchHtmlWithRetry(targetUrl);
  const inlineHashes = collectInlineScriptHashes(html);

  if (!inlineHashes.includes(configuredHash)) {
    const sampleHashes = inlineHashes.slice(0, 8).join(', ');
    throw new Error(
      [
        'Configured CSP hash does not match inline scripts on Dify chatbot page.',
        `Configured: sha256-${configuredHash}`,
        `Observed (${inlineHashes.length} hashes): ${sampleHashes || '(none)'}`,
        `Target URL: ${targetUrl}`,
        'Update src/middleware.ts script-src hash if Dify changed its inline bootstrap snippet.',
      ].join('\n')
    );
  }

  console.log(`OK: Dify inline script hash matches middleware CSP (sha256-${configuredHash})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

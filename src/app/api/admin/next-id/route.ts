/**
 * API Route: Get Next Available Akyo ID
 * GET /api/admin/next-id
 * Returns: { nextId: string }
 *
 * Finds the maximum ID in the CSV and returns the next available 4-digit ID.
 */

import { jsonError, validateSession } from '@/lib/api-helpers';
import { fetchCSVFromGitHub } from '@/lib/github-utils';
import { formatAkyoId, parseAkyoIdNumber, pickLatestAkyoId, readNextIdHint } from '@/lib/next-id-state';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import fs from 'fs/promises';
import path from 'path';

interface R2TextObject {
  text: () => Promise<string>;
}

interface R2BucketBinding {
  get: (key: string) => Promise<R2TextObject | null>;
}

interface NextIdEnv {
  AKYO_BUCKET?: R2BucketBinding;
}

export const runtime = 'nodejs';

const DEFAULT_CSV_PATH = 'data/akyo-data-ja.csv';
const GITHUB_CSV_URL =
  'https://raw.githubusercontent.com/rad-vrc/Akyodex/main/data/akyo-data-ja.csv';
const FETCH_TIMEOUT_MS = 5000;
const NEXT_ID_CACHE_TTL_MS = 1500;
const GITHUB_API_TIMEOUT_MS = 3500;

let cachedCsvNextId: { value: number; expiresAt: number } | null = null;

function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_ts=${Date.now()}`;
}

async function fetchCsvText(url: string): Promise<string | null> {
  try {
    const response = await fetch(addCacheBuster(url), {
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[next-id] Fetch timeout for ${url}`);
    }
    return null;
  }
}

function getCachedCsvNextId(): number | null {
  if (!cachedCsvNextId) return null;
  if (cachedCsvNextId.expiresAt < Date.now()) {
    cachedCsvNextId = null;
    return null;
  }
  return cachedCsvNextId.value;
}

function setCachedCsvNextId(idNum: number): void {
  cachedCsvNextId = {
    value: idNum,
    expiresAt: Date.now() + NEXT_ID_CACHE_TTL_MS,
  };
}

function computeNextIdFromCsv(csvContent: string): number {
  const lines = csvContent.split('\n').filter((line) => line.trim());
  const dataLines = lines.slice(1);
  const usedIds = new Set<number>();

  for (const line of dataLines) {
    const match = line.match(/^"?(\d+)"?/);
    if (!match) continue;
    const id = Number.parseInt(match[1], 10);
    if (!Number.isNaN(id)) {
      usedIds.add(id);
    }
  }

  let nextIdNum = 1;
  while (usedIds.has(nextIdNum)) {
    nextIdNum += 1;
  }
  return nextIdNum;
}

export async function GET() {
  // Validate admin session
  const session = await validateSession();
  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  try {
    let csvContent = '';
    let csvNextIdNum = getCachedCsvNextId();

    // Resolve Cloudflare bindings for bucket/KV access when available.
    let env: NextIdEnv | undefined;
    try {
      const ctx = getCloudflareContext();
      env = ctx?.env as NextIdEnv | undefined;
    } catch {
      env = undefined;
    }

    const bucket = env?.AKYO_BUCKET;

    if (csvNextIdNum === null) {
      if (!bucket) {
        // Development: Prefer local workspace CSV to avoid remote sync lag.
        try {
          const localCsvPath = path.join(process.cwd(), DEFAULT_CSV_PATH);
          csvContent = await fs.readFile(localCsvPath, 'utf-8');
        } catch {
          csvContent = '';
        }
      }

      if (!csvContent && bucket) {
        // Fast source: R2 bucket (supports legacy and current key layouts).
        const configuredPath = process.env.GITHUB_CSV_PATH_JA;
        const candidatePaths = [
          configuredPath,
          'akyo-data/akyo-data-ja.csv',
          DEFAULT_CSV_PATH,
        ].filter((value): value is string => Boolean(value));

        for (const csvPath of candidatePaths) {
          const csvObject = await bucket.get(csvPath);
          if (csvObject) {
            csvContent = await csvObject.text();
            break;
          }
        }
      }

      if (!csvContent) {
        // Fallback to public R2 URL.
        const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
        const publicCsvUrls = [
          `${r2BaseUrl}/akyo-data/akyo-data-ja.csv`,
          `${r2BaseUrl}/data/akyo-data-ja.csv`,
        ];

        for (const csvUrl of publicCsvUrls) {
          const fetched = await fetchCsvText(csvUrl);
          if (fetched) {
            csvContent = fetched;
            break;
          }
        }
      }

      if (!csvContent) {
        // Authoritative fallback: GitHub API (short timeout to avoid admin UI stalls).
        try {
          const githubCsv = await fetchCSVFromGitHub(
            'akyo-data-ja.csv',
            undefined,
            GITHUB_API_TIMEOUT_MS
          );
          csvContent = githubCsv.content;
        } catch {
          csvContent = '';
        }
      }

      if (!csvContent) {
        // Final fallback: GitHub raw CSV.
        const githubCsv = await fetchCsvText(GITHUB_CSV_URL);
        if (githubCsv) {
          csvContent = githubCsv;
        }
      }

      if (csvContent) {
        csvNextIdNum = computeNextIdFromCsv(csvContent);
        setCachedCsvNextId(csvNextIdNum);
      } else {
        csvNextIdNum = 1;
      }
    }

    const hintedNextIdNum = await readNextIdHint();
    const mergedNextIdNum = pickLatestAkyoId(
      parseAkyoIdNumber(csvNextIdNum),
      hintedNextIdNum
    );
    const nextId = formatAkyoId(mergedNextIdNum ?? 1);

    return Response.json({ nextId });
  } catch (error) {
    console.error('[next-id] Error:', error);
    return jsonError('Failed to fetch next ID', 500, { nextId: '0001' });
  }
}

/**
 * API Route: Get Next Available Akyo ID
 * GET /api/admin/next-id
 * Returns: { nextId: string }
 *
 * Finds the maximum ID in the CSV and returns the next available 4-digit ID.
 */

import { jsonError, validateSession } from '@/lib/api-helpers';
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

function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_ts=${Date.now()}`;
}

async function fetchCsvText(url: string): Promise<string | null> {
  try {
    const response = await fetch(addCacheBuster(url), {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function GET() {
  // Validate admin session
  const session = await validateSession();
  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  try {
    let csvContent: string;

    // Try R2 bucket first (production)
    let env: NextIdEnv | undefined;
    try {
      const ctx = getCloudflareContext();
      env = ctx?.env as NextIdEnv | undefined;
    } catch {
      env = undefined;
    }

    const bucket = env?.AKYO_BUCKET;

    if (!bucket) {
      // Development: Prefer local workspace CSV to avoid remote sync lag.
      try {
        const localCsvPath = path.join(process.cwd(), DEFAULT_CSV_PATH);
        csvContent = await fs.readFile(localCsvPath, 'utf-8');
      } catch {
        csvContent = '';
      }
    } else {
      csvContent = '';
    }

    if (!csvContent && bucket) {
      // Production: Read from R2 bucket (support both legacy and current key layouts).
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
      // Fallback to public R2 URL (no-store to avoid stale cache).
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
      // Final fallback: GitHub raw CSV.
      const githubCsv = await fetchCsvText(GITHUB_CSV_URL);
      if (!githubCsv) {
        return Response.json({ nextId: '0001' });
      }
      csvContent = githubCsv;
    }

    const lines = csvContent.split('\n').filter((line) => line.trim());

    // Skip header
    const dataLines = lines.slice(1);

    // Collect used IDs
    const usedIds = new Set<number>();
    for (const line of dataLines) {
      // Extract ID from first column (handle quoted fields)
      const match = line.match(/^"?(\d+)"?/);
      if (match) {
        const id = parseInt(match[1], 10);
        if (!isNaN(id)) {
          usedIds.add(id);
        }
      }
    }

    // Return smallest available ID with 4-digit padding
    let nextIdNum = 1;
    while (usedIds.has(nextIdNum)) {
      nextIdNum += 1;
    }
    const nextId = nextIdNum.toString().padStart(4, '0');

    return Response.json({ nextId });
  } catch (error) {
    console.error('[next-id] Error:', error);
    return jsonError('Failed to fetch next ID', 500, { nextId: '0001' });
  }
}

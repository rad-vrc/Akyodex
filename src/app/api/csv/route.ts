import { jsonError } from '@/lib/api-helpers';
import { isValidLanguage, type SupportedLanguage } from '@/lib/i18n';
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_R2_BASE_URL = 'https://images.akyodex.com';
const DEFAULT_GITHUB_OWNER = 'rad-vrc';
const DEFAULT_GITHUB_REPO = 'Akyodex';
const DEFAULT_GITHUB_BRANCH = 'main';

async function readLocalCsv(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function fetchCsvFromCandidates(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        console.warn(`[api/csv] Failed candidate: ${url} (${response.status})`);
        continue;
      }
      const text = await response.text();
      if (!text.trim()) {
        console.warn(`[api/csv] Empty CSV from candidate: ${url}`);
        continue;
      }
      return text;
    } catch (error) {
      console.warn(`[api/csv] Candidate fetch error: ${url}`, error);
    }
  }
  return null;
}

/**
 * This route requires Node.js runtime because:
 * - Uses fs.readFile for local file system access
 *
 * Future Edge Runtime Migration:
 * - Migrate CSV files to R2 public URL (https://images.akyodex.com/data/akyo-data-ja.csv)
 * - Replace fs.readFile with fetch() call
 * - Change runtime to 'edge'
 */
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // クエリパラメータから言語を取得（デフォルトは日本語）
    const { searchParams } = new URL(request.url);
    const rawLang = searchParams.get('lang') ?? '';
    const lang: SupportedLanguage = isValidLanguage(rawLang)
      ? (rawLang as SupportedLanguage)
      : 'ja';

    const csvFilename = `akyo-data-${lang}.csv`;

    // 1) Local file (dev / Node runtime with bundled data)
    const csvPath = path.join(process.cwd(), 'data', csvFilename);
    let csvContent = await readLocalCsv(csvPath);

    // 2) Public URLs fallback (R2 and GitHub raw)
    if (!csvContent) {
      const r2BaseUrl = (process.env.NEXT_PUBLIC_R2_BASE || DEFAULT_R2_BASE_URL).replace(/\/$/, '');
      const githubOwner = process.env.GITHUB_REPO_OWNER || DEFAULT_GITHUB_OWNER;
      const githubRepo = process.env.GITHUB_REPO_NAME || DEFAULT_GITHUB_REPO;
      const githubBranch = process.env.GITHUB_BRANCH || DEFAULT_GITHUB_BRANCH;

      const csvCandidates = [
        `${r2BaseUrl}/akyo-data/${csvFilename}`,
        `${r2BaseUrl}/data/${csvFilename}`,
        `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/data/${csvFilename}`,
      ];

      csvContent = await fetchCsvFromCandidates(csvCandidates);
    }

    if (!csvContent) {
      return jsonError('Failed to load CSV data', 500);
    }

    // CSVとして返す
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFilename}"`,
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Failed to load CSV:', error);
    return jsonError('Failed to load CSV data', 500);
  }
}

import { jsonError } from '@/lib/api-helpers';
import fs from 'fs/promises';
import path from 'path';

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
    const rawLang = searchParams.get('lang');
    const lang = rawLang === 'en' ? 'en' : rawLang === 'ko' ? 'ko' : 'ja';

    // CSVファイルのパス
    const csvPath = path.join(process.cwd(), 'data', `akyo-data-${lang}.csv`);

    // ファイルを読み込む
    const csvContent = await fs.readFile(csvPath, 'utf-8');

    // CSVとして返す
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Failed to load CSV:', error);
    return jsonError('Failed to load CSV data', 500);
  }
}

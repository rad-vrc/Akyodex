import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // CSVファイルのパス
    const csvPath = path.join(process.cwd(), 'data', 'akyo-data.csv');
    
    // ファイルを読み込む
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    // CSVとして返す
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Failed to load CSV:', error);
    return NextResponse.json(
      { error: 'Failed to load CSV data' },
      { status: 500 }
    );
  }
}

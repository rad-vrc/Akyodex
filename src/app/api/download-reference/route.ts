/**
 * 三面図ダウンロードAPI
 * 
 * R2から画像を取得し、Content-Disposition ヘッダー付きで返す
 * これによりクロスオリジンでもダウンロードが可能になる
 */

import { connection, NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  await connection();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  // ID のバリデーション（4桁の数字のみ許可）
  if (!/^\d{4}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
  }

  const r2Base = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
  const imageUrl = `${r2Base}/${id}.png`;

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Image not found: ${response.status}` },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const filename = `akyo-${id}-reference.png`;

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400', // 1日キャッシュ
      },
    });
  } catch (error) {
    console.error('[download-reference] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

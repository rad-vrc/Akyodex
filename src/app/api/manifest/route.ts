export const runtime = 'edge';

export async function GET() {
  try {
    // TODO: 将来的にはR2/KVから画像マニフェストを取得
    // 現在は空のオブジェクトを返す（既存の画像フォールバック機構が動作する）
    const manifest = {};

    return Response.json(manifest, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Failed to load manifest:', error);
    return Response.json({}, { status: 200 });
  }
}

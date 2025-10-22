import { ImageResponse } from 'next/og';

// 画像サイズ設定
export const alt = 'Akyoずかん - VRChatアバター Akyo図鑑';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

/**
 * OGP画像を動的生成
 * Next.js 15の機能を使用してSNS共有用画像を自動生成
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 80,
          background: 'linear-gradient(135deg, #FFF5E6 0%, #E6F7FF 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        {/* グラデーション背景 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(255, 107, 157, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(102, 217, 165, 0.15) 0%, transparent 50%)',
          }}
        />
        
        {/* タイトル */}
        <div
          style={{
            fontSize: 100,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #FF6B9D 0%, #FFA06D 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 20,
            textShadow: '4px 4px 8px rgba(0,0,0,0.1)',
          }}
        >
          Akyoずかん
        </div>
        
        {/* サブタイトル */}
        <div
          style={{
            fontSize: 36,
            color: '#4A4A4A',
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録
        </div>
        
        {/* バッジ */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginTop: 40,
          }}
        >
          <div
            style={{
              padding: '15px 30px',
              background: 'rgba(102, 178, 255, 0.2)',
              color: '#2196f3',
              borderRadius: 9999,
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            500+ Akyos
          </div>
          <div
            style={{
              padding: '15px 30px',
              background: 'rgba(102, 217, 165, 0.2)',
              color: '#2f855a',
              borderRadius: 9999,
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            日本語/英語対応
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

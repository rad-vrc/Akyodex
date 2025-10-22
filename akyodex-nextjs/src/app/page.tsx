import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <main className="max-w-4xl w-full space-y-8">
        {/* ロゴとタイトル */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Image
              src="/images/logo.webp"
              alt="Akyoずかん"
              width={1980}
              height={305}
              className="logo-animation w-full max-w-md sm:max-w-lg md:max-w-xl h-auto"
              priority
            />
          </div>
          <p className="text-xl sm:text-2xl text-[var(--text-primary)] font-bold">
            500種類以上のなぞの生き物を探索しよう！
          </p>
        </div>

        {/* 機能カード */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="akyo-card p-6 text-center space-y-3">
            <div className="text-4xl">📚</div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--primary-pink)' }}>
              500種類以上
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              多彩なAkyoたちを検索・閲覧できます
            </p>
          </div>

          <div className="akyo-card p-6 text-center space-y-3">
            <div className="text-4xl">⭐</div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--primary-yellow)' }}>
              お気に入り機能
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              好きなAkyoをコレクションできます
            </p>
          </div>

          <div className="akyo-card p-6 text-center space-y-3 sm:col-span-2 md:col-span-1">
            <div className="text-4xl">🎮</div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--primary-blue)' }}>
              VRChat連携
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              アバターへの直接リンクを提供
            </p>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="/zukan"
            className="btn w-full sm:w-auto px-8 py-3 text-lg text-white font-bold shadow-lg hover:shadow-xl text-center"
            style={{ background: 'linear-gradient(135deg, var(--primary-pink), var(--primary-orange))' }}
          >
            📖 図鑑を見る
          </a>
          <a
            href="/admin"
            className="btn w-full sm:w-auto px-8 py-3 text-lg text-white font-bold shadow-lg hover:shadow-xl text-center"
            style={{ background: 'linear-gradient(135deg, var(--primary-blue), var(--primary-green))' }}
          >
            ⚙️ 管理画面
          </a>
        </div>

        {/* 統計情報 */}
        <div className="akyo-card p-6 sm:p-8 text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            🎯 Next.js 15への移行プロジェクト
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--primary-pink)' }}>
                Next.js 15
              </div>
              <div className="text-xs sm:text-sm text-[var(--text-secondary)]">最新フレームワーク</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                React 19
              </div>
              <div className="text-xs sm:text-sm text-[var(--text-secondary)]">最新バージョン</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--primary-green)' }}>
                Tailwind v4
              </div>
              <div className="text-xs sm:text-sm text-[var(--text-secondary)]">CSSフレームワーク</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--primary-orange)' }}>
                TypeScript
              </div>
              <div className="text-xs sm:text-sm text-[var(--text-secondary)]">型安全性</div>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-12 sm:mt-16 text-center text-[var(--text-secondary)] text-sm px-4">
        <p>&copy; 2025 Akyoずかん - すべてのAkyoファンのために</p>
      </footer>
    </div>
  );
}

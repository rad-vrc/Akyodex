/**
 * 構造化データ（JSON-LD）コンポーネント
 * SEO最適化のためのSchema.org準拠の構造化データ
 */

export function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Akyoずかん',
    alternateName: 'Akyodex',
    url: 'https://akyodex.com',
    description: 'VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト',
    inLanguage: ['ja-JP', 'en-US'],
    author: {
      '@type': 'Person',
      name: 'らど',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Akyodex',
      logo: {
        '@type': 'ImageObject',
        url: 'https://akyodex.com/images/logo-200.png',
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://akyodex.com/zukan?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

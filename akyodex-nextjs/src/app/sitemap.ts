import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://akyodex.com';
  const currentDate = new Date();

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/zukan`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // 追加のページがあればここに記述
  ];
}

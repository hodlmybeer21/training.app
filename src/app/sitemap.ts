import type { MetadataRoute } from 'next';

const SITE = 'https://training.goodbotai.tech';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/pricing', '/about', '/privacy', '/terms', '/login'].map((path) => ({
    url: `${SITE}${path}`,
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : 0.6,
  }));
}

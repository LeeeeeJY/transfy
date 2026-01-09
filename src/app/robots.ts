import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/private/'], // API 경로는 크롤링 제외
    },
    sitemap: 'https://transfy-wine.vercel.app/sitemap.xml',
  };
}

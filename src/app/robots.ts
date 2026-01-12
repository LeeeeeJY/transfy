import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://transfy-wine.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Next.js 내부 파일도 읽을 수 있게 허용 (렌더링 확인용)
      disallow: ['/private/', '/admin/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

import { MetadataRoute } from 'next';
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;

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

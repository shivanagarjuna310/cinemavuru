import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cinemavuru.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/cv-admin-1a25', '/profile', '/auth'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}

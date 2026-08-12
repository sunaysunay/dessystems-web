import type { MetadataRoute } from 'next'
import { locales } from '@/src/i18n/routing'
import { SITE_URL } from '@/src/i18n/seo'

const ROUTES = ['', '/solutions', '/deslab', '/contact', '/about', '/founder', '/platform', '/platform/calculator']

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map(path => ({
    url: `${SITE_URL}${path || '/'}`,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
    alternates: {
      languages: Object.fromEntries(locales.map(l => [l, `${SITE_URL}/${l}${path}`])),
    },
  }))
}

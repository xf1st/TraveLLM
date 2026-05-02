import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getAllArticleIds } from '@/lib/articles'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'travellm.ru'
  const baseUrl = `https://${host}`

  const staticRoutes = [
    { path: '', priority: 1 as const, changefreq: 'weekly' as const },
    { path: '/plan', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/guide', priority: 0.85, changefreq: 'weekly' as const },
    { path: '/news', priority: 0.7, changefreq: 'weekly' as const },
    { path: '/reels', priority: 0.75, changefreq: 'daily' as const },
    { path: '/support', priority: 0.7, changefreq: 'monthly' as const },
    { path: '/privacy', priority: 0.5, changefreq: 'yearly' as const },
    { path: '/terms', priority: 0.5, changefreq: 'yearly' as const },
    { path: '/cookies', priority: 0.4, changefreq: 'yearly' as const },
  ].map(({ path, priority, changefreq }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: changefreq,
    priority,
  }))

  const articleRoutes: MetadataRoute.Sitemap = getAllArticleIds().map((id) => ({
    url: `${baseUrl}/news/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.65,
  }))

  return [...staticRoutes, ...articleRoutes]
}

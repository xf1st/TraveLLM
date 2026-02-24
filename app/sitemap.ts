import { MetadataRoute } from 'next'
import { articlesLibrary } from '@/lib/articles'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://travellm.ru'

  // Static routes
  const staticRoutes = [
    '',
    '/news',
    '/plan',
    '/privacy',
    '/terms',
    '/support',
    '/subscribe',
    '/waitlist',
    '/onboarding',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // Dynamic news routes
  const newsRoutes = articlesLibrary.map((article) => ({
    url: `${baseUrl}/news/${article.id}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...newsRoutes]
}

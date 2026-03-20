import { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'travellm.ru'
  const baseUrl = `https://${host}`

  const staticRoutes = [
    '',
    '/plan',
    '/privacy',
    '/terms',
    '/cookies',
    '/guide',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  return staticRoutes
}

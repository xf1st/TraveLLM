import { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'travellm.ru'
  const baseUrl = `https://${host}`

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/callback', '/auth/auth-code-error'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/private/', '/dashboard/', '/api/'], // Protects your heavy-lifting logic from search engines
    },
    sitemap: 'https://www.bbu1.com/sitemap.xml', // REPLACE with your actual domain
  }
}
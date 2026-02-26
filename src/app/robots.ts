import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/admin/',
                    '/offline/',
                    '/manifest.webmanifest',
                    '/sw.js',
                ],
            },
        ],
        sitemap: 'https://akyodex.com/sitemap.xml',
        host: 'https://akyodex.com',
    }
}

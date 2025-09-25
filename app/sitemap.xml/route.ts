// app/sitemap.xml/route.ts
export const revalidate = 86400 // 24h

export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://app.plateapedia.com/sitemaps/profiles.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://app.plateapedia.com/sitemaps/collections.xml</loc>
  </sitemap>
</sitemapindex>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

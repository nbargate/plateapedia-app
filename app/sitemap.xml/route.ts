export function GET() {
  const urls = [
    { loc: 'https://app.plateapedia.com/', changefreq: 'daily', priority: 1.0 },
    { loc: 'https://app.plateapedia.com/u', changefreq: 'daily', priority: 0.8 },
    { loc: 'https://app.plateapedia.com/c', changefreq: 'daily', priority: 0.8 },
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `<url>
  <loc>${u.loc}</loc>
  <changefreq>${u.changefreq}</changefreq>
  <priority>${u.priority}</priority>
</url>`
  )
  .join('\n')}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}

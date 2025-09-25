export function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: https://app.plateapedia.com/sitemap.xml
`
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  })
}

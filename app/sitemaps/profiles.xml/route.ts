// app/sitemaps/profiles.xml/route.ts
import { createClient } from '@supabase/supabase-js'

export const revalidate = 86400 // 24h

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  const supabase = createClient(url, anon, { auth: { persistSession: false } })

  // Public handles only (non-null, non-empty)
  const { data, error } = await supabase
    .from('profiles')
    .select('handle')
    .not('handle', 'is', null)

  if (error) {
    // Return an empty but valid sitemap on error
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      status: 200,
    })
  }

  const handles = (data ?? [])
    .map((p: any) => (p.handle as string)?.trim())
    .filter(Boolean)

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${handles
  .map(
    (h) => `  <url>
    <loc>https://app.plateapedia.com/u/${h}</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

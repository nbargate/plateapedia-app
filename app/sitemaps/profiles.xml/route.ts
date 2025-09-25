// app/sitemaps/profiles.xml/route.ts
import { createClient } from '@supabase/supabase-js'

export const revalidate = 86400 // 24h

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function toYMD(d?: string | null) {
  try {
    if (!d) return new Date().toISOString().split('T')[0]
    return new Date(d).toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

export async function GET() {
  const supabase = createClient(url, anon, { auth: { persistSession: false } })

  // We assume profiles has created_at/updated_at; if not, remove those fields below.
  const { data, error } = await supabase
    .from('profiles')
    .select('handle, updated_at, created_at')
    .not('handle', 'is', null)

  if (error) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { 'Content-Type': 'application/xml; charset=utf-8' }, status: 200 }
    )
  }

  const rows = (data ?? [])
    .map((p: any) => ({
      handle: (p.handle as string)?.trim(),
      lastmod: toYMD(p.updated_at ?? p.created_at),
    }))
    .filter((p) => !!p.handle)

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows
  .map(
    (r) => `  <url>
    <loc>https://app.plateapedia.com/u/${r.handle}</loc>
    <lastmod>${r.lastmod}</lastmod>
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

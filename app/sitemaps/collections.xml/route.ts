// app/sitemaps/collections.xml/route.ts
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

  // Public collections only, need slug + owner's handle + timestamps for lastmod
  const { data, error } = await supabase
    .from('collections')
    .select(`
      slug,
      is_public,
      updated_at,
      created_at,
      owner:profiles!collections_owner_id_fkey(handle)
    `)
    .eq('is_public', true)

  if (error) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { 'Content-Type': 'application/xml; charset=utf-8' }, status: 200 }
    )
  }

  const rows = (data ?? [])
    .filter((r: any) => r?.slug && r?.owner?.handle)
    .map((r: any) => ({
      handle: String(r.owner.handle).trim(),
      slug: String(r.slug).trim(),
      lastmod: toYMD(r.updated_at ?? r.created_at),
    }))

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows
  .map(
    (r) => `  <url>
    <loc>https://app.plateapedia.com/u/${r.handle}/${r.slug}</loc>
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

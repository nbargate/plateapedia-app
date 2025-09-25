// app/sitemaps/collections.xml/route.ts
import { createClient } from '@supabase/supabase-js'

export const revalidate = 86400 // 24h

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  const supabase = createClient(url, anon, { auth: { persistSession: false } })

  // We need collection slug and the owner's handle to build /u/{handle}/{slug}
  // Only include PUBLIC collections with a non-null slug.
  const { data, error } = await supabase
    .from('collections')
    .select(
      `
      slug,
      is_public,
      owner:profiles!collections_owner_id_fkey(handle)
    `
    )
    .eq('is_public', true)
  // If you stored slug as nullable, you can also exclude null:
  // .not('slug','is',null)

  if (error) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      status: 200,
    })
  }

  const rows = (data ?? []).filter(
    (r: any) => r?.slug && r?.owner?.handle
  )

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows
  .map((r: any) => {
    const handle = String(r.owner.handle).trim()
    const slug = String(r.slug).trim()
    return `  <url>
    <loc>https://app.plateapedia.com/u/${handle}/${slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`
  })
  .join('\n')}
</urlset>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

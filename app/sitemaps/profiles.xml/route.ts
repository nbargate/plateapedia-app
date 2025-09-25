// app/sitemaps/profiles.xml/route.ts
import { createClient } from '@supabase/supabase-js'

export const revalidate = 86400 // 24h cache

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

  // Try to read timestamps; if the table doesn't have them, fall back to handle-only.
  let rows: { handle: string; lastmod: string }[] = []

  // Attempt 1: with timestamps
  const tryWithTimestamps = await supabase
    .from('profiles')
    .select('handle, updated_at, created_at')
    .not('handle', 'is', null)

  if (!tryWithTimestamps.error && tryWithTimestamps.data) {
    rows = tryWithTimestamps.data
      .map((p: any) => ({
        handle: String(p.handle || '').trim(),
        lastmod: toYMD(p.updated_at ?? p.created_at),
      }))
      .filter((r) => !!r.handle)
  } else {
    // Attempt 2: no timestamps available (or RLS blocked fields). Use handle only.
    const tryHandlesOnly = await supabase
      .from('profiles')
      .select('handle')
      .not('handle', 'is', null)

    if (!tryHandlesOnly.error && tryHandlesOnly.data) {
      const today = toYMD()
      rows = tryHandlesOnly.data
        .map((p: any) => ({ handle: String(p.handle || '').trim(), lastmod: today }))
        .filter((r) => !!r.handle)
    } else {
      // Still blocked/error -> return an empty but valid sitemap
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
        {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
          },
          status: 200,
        }
      )
    }
  }

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

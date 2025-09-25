'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '../../../lib/supabaseClient'

type Plate = {
  id: string
  country_code: string
  region_code: string | null
  year: number | null
  serial: string | null
  is_public: boolean
}

type Collection = {
  id: string
  name: string
  description: string | null
  slug: string | null
  is_public: boolean
}

export default function PublicProfilePage({ params }: any) {
  const supabase = getSupabaseBrowser()
  const handle: string = params?.handle

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [publicPlates, setPublicPlates] = useState<Plate[]>([])
  const [publicCollections, setPublicCollections] = useState<Collection[]>([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)

      // 1) Resolve handle -> owner id
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, handle')
        .ilike('handle', handle)
        .single()

      if (profErr || !prof) {
        setError('User not found.')
        setLoading(false)
        return
      }
      const uid = prof.id as string
      setOwnerId(uid)

      // 2) Load public collections for this owner
      const { data: cols, error: colsErr } = await supabase
        .from('collections')
        .select('id,name,description,slug,is_public')
        .eq('owner_id', uid)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (colsErr) {
        setError(colsErr.message)
        setLoading(false)
        return
      }
      setPublicCollections(cols ?? [])

      // 3) Load public plates for this owner (optional: show latest)
      const { data: plates, error: platesErr } = await supabase
        .from('plates')
        .select('id,country_code,region_code,year,serial,is_public')
        .eq('is_public', true)
        .eq('owner_id', uid)
        .order('created_at', { ascending: false })
        .limit(20)

      if (platesErr) {
        setError(platesErr.message)
        setLoading(false)
        return
      }

      setPublicPlates(plates ?? [])
      setLoading(false)
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle])

  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
        <p>Loading…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
        <p>{error}</p>
      </main>
    )
  }

  if (!ownerId) {
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
        <p>User not found.</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <p style={{ marginBottom: 8 }}>
        <a href="/" style={{ textDecoration: 'none' }}>← Back</a>
      </p>

      <h1 style={{ marginBottom: 8 }}>/u/{handle}</h1>

      <h2>Public collections</h2>
      {publicCollections.length === 0 ? (
        <p style={{ color: '#666', marginBottom: 16 }}>No public collections yet.</p>
      ) : (
        <ul style={{ marginBottom: 24 }}>
          {publicCollections.map((c) => (
            <li key={c.id} style={{ marginBottom: 6 }}>
              {c.slug ? (
                <strong><a href={`/u/${handle}/${c.slug}`}>{c.name}</a></strong>
              ) : (
                <strong>{c.name}</strong>
              )}
              {c.description ? ` — ${c.description}` : ''}
            </li>
          ))}
        </ul>
      )}

      <h2>Recent public plates</h2>
      {publicPlates.length === 0 ? (
        <p style={{ color: '#666' }}>No public plates yet.</p>
      ) : (
        <ul>
          {publicPlates.map((p) => (
            <li key={p.id} style={{ marginBottom: 6 }}>
              {p.country_code}
              {p.region_code ? `-${p.region_code}` : ''}
              {p.year ? ` ${p.year}` : ''}
              {p.serial ? ` — ${p.serial}` : ''}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

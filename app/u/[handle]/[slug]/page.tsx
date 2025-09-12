'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '../../../../lib/supabaseClient'

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
  is_public: boolean
}

export default function PublicCollectionPage({ params }: any) {
  const supabase = getSupabaseBrowser()
  const handle: string = params?.handle
  const slug: string = params?.slug

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collection, setCollection] = useState<Collection | null>(null)
  const [plates, setPlates] = useState<Plate[]>([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)

      // 1) Find the owner id by handle
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, handle')
        .ilike('handle', handle) // case-insensitive
        .single()

      if (profErr || !prof) {
        setError('User not found.')
        setLoading(false)
        return
      }

      const ownerId = prof.id as string

      // 2) Fetch the PUBLIC collection by slug for this owner
      const { data: col, error: colErr } = await supabase
        .from('collections')
        .select('id,name,description,is_public')
        .eq('owner_id', ownerId)
        .ilike('slug', slug) // case-insensitive
        .eq('is_public', true)
        .single()

      if (colErr || !col) {
        setError('Public collection not found.')
        setLoading(false)
        return
      }
      setCollection(col as Collection)

      // 3) Fetch plates linked to the collection, but only public plates
      const { data: rows, error: rowsErr } = await supabase
        .from('plates_collections')
        .select('plate:plates(id,country_code,region_code,year,serial,is_public)')
        .eq('collection_id', col.id)

      if (rowsErr) {
        setError(rowsErr.message)
        setLoading(false)
        return
      }

      const ps = (rows ?? [])
        .map((r: any) => r.plate as Plate)
        .filter(Boolean)
        .filter((p) => p.is_public) // public plates only

      setPlates(ps)
      setLoading(false)
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, slug])

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

  if (!collection) {
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
        <p>Public collection not found.</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <p style={{ marginBottom: 8 }}>
        <a href={`/u/${handle}`} style={{ textDecoration: 'none' }}>← Back to {handle}</a>
      </p>

      <h1>{collection.name}</h1>
      {collection.description && (
        <p style={{ color: '#555' }}>{collection.description}</p>
      )}

      <h2 style={{ marginTop: 24 }}>
        Public plates in this collection ({plates.length})
      </h2>

      {plates.length === 0 ? (
        <p style={{ color: '#666' }}>No public plates yet.</p>
      ) : (
        <ul>
          {plates.map((p) => (
            <li key={p.id} style={{ marginBottom: 6 }}>
              <span>
                {p.country_code}
                {p.region_code ? `-${p.region_code}` : ''}
                {p.year ? ` ${p.year}` : ''}
                {p.serial ? ` — ${p.serial}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}


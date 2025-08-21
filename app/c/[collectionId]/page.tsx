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
}

export default function CollectionPage({ params }: { params: { collectionId: string } }) {
  const supabase = getSupabaseBrowser()
  const collectionId = params.collectionId

  const [userId, setUserId] = useState<string | null>(null)
  const [collection, setCollection] = useState<Collection | null>(null)
  const [plates, setPlates] = useState<Plate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError(null)

      // user
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id ?? null
      setUserId(uid)
      if (!uid) {
        setLoading(false)
        setError('Please sign in to view your collection.')
        return
      }

      // fetch collection (owned by user)
      const { data: col, error: colErr } = await supabase
        .from('collections')
        .select('id,name,description')
        .eq('id', collectionId)
        .eq('owner_id', uid)
        .single()

      if (colErr || !col) {
        setLoading(false)
        setError('Collection not found.')
        return
      }
      setCollection(col as Collection)

      // fetch plates via join table
      const { data: rows, error: rowsErr } = await supabase
        .from('plates_collections')
        .select(
          'plate:plates(id,country_code,region_code,year,serial,is_public)'
        )
        .eq('collection_id', collectionId)
        .eq('owner_id', uid)
        .order('added_at', { ascending: false })

      if (rowsErr) {
        setLoading(false)
        setError(rowsErr.message)
        return
      }

      const ps = (rows ?? []).map((r: any) => r.plate as Plate).filter(Boolean)
      setPlates(ps)
      setLoading(false)
    }

    init()
  }, [collectionId, supabase])

  if (loading) {
    return <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <p>Loading…</p>
    </main>
  }

  if (error) {
    return <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <p>{error}</p>
    </main>
  }

  if (!collection) {
    return <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <p>Collection not found.</p>
    </main>
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>{collection.name}</h1>
      {collection.description && <p style={{ color: '#555' }}>{collection.description}</p>}

      <h2 style={{ marginTop: 24 }}>Plates in this collection</h2>
      {plates.length === 0 ? (
        <p style={{ color: '#666' }}>No plates yet.</p>
      ) : (
        <ul>
          {plates.map((p) => (
            <li key={p.id}>
              {p.country_code}
              {p.region_code ? `-${p.region_code}` : ''}
              {p.year ? ` ${p.year}` : ''}
              {p.serial ? ` — ${p.serial}` : ''}
              {p.is_public ? ' (public)' : ''}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

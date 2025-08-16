'use client'
import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '../../../lib/supabaseClient'

type Plate = {
  id: string
  country_code: string
  region_code: string | null
  year: number | null
  serial: string | null
}

export default function UserPublicPage({ params }: { params: { ownerId: string } }) {
  const supabase = getSupabaseBrowser()
  const ownerId = params.ownerId
  const [plates, setPlates] = useState<Plate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('plates')
        .select('id,country_code,region_code,year,serial')
        .eq('owner_id', ownerId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
      setPlates(data ?? [])
      setLoading(false)
    }
    load()
  }, [ownerId])

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>Collector’s Public Plates</h1>
      <p style={{ color: '#666' }}>User ID: {ownerId}</p>
      {loading ? <p>Loading…</p> : (
        plates.length === 0 ? <p>No public plates yet.</p> : (
          <ul>
            {plates.map(p => (
              <li key={p.id}>
                {p.country_code}{p.region_code ? `-${p.region_code}` : ''}{p.year ? ` ${p.year}` : ''}{p.serial ? ` — ${p.serial}` : ''}
              </li>
            ))}
          </ul>
        )
      )}
    </main>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '../../lib/supabaseClient'

type Plate = {
  id: string
  country_code: string
  region_code: string | null
  year: number | null
  serial: string | null
}

export default function PublicPlates() {
  const supabase = getSupabaseBrowser()
  const [plates, setPlates] = useState<Plate[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('plates')
        .select('id,country_code,region_code,year,serial')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
      setPlates(data ?? [])
    }
    load()
  }, [])

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>Public Plates</h1>
      <ul>
        {plates.map(p => (
          <li key={p.id}>
            {p.country_code}
            {p.region_code ? `-${p.region_code}` : ''}
            {p.year ? ` ${p.year}` : ''}
            {p.serial ? ` — ${p.serial}` : ''}
          </li>
        ))}
      </ul>
    </main>
  )
}

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

type Profile = {
  id: string
  handle: string | null
  display_name: string | null
  is_public: boolean | null
}

export default function HandlePublicPage({ params }: any) {
  const supabase = getSupabaseBrowser()
  const handle = params.handle as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [plates, setPlates] = useState<Plate[]>([])
  const [status, setStatus] = useState<'loading' | 'notfound' | 'private' | 'ready'>('loading')

  useEffect(() => {
    const load = async () => {
      // 1) Look up the profile by handle
      const { data: prof } = await supabase
        .from('profiles')
        .select('id,handle,display_name,is_public')
        .ilike('handle', handle) // case-insensitive match
        .single()


      if (!prof) {
        setStatus('notfound')
        return
      }
      if (prof.is_public === false) {
        setStatus('private')
        return
      }

      setProfile(prof)

      // 2) Load that user's public plates
      const { data: pubs } = await supabase
        .from('plates')
        .select('id,country_code,region_code,year,serial')
        .eq('owner_id', prof.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      setPlates(pubs ?? [])
      setStatus('ready')
    }

    load()
  }, [handle])

  if (status === 'loading') {
    return <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>Loading…</main>
  }
  if (status === 'notfound') {
    return <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>Profile not found</h1>
      <p>No user with handle <code>{handle}</code>.</p>
    </main>
  }
  if (status === 'private') {
    return <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>Profile is private</h1>
      <p>This user’s profile isn’t public.</p>
    </main>
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>{profile?.display_name || profile?.handle || 'Collector'}</h1>
      <p style={{ color: '#666' }}>@{profile?.handle}</p>

      {plates.length === 0 ? (
        <p>No public plates yet.</p>
      ) : (
        <ul>
          {plates.map((p) => (
            <li key={p.id}>
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

'use client'
import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '../lib/supabaseClient'

type Plate = {
  id: string
  country_code: string
  region_code: string | null
  year: number | null
  serial: string | null
  is_public: boolean
}

export default function Home() {
  const supabase = getSupabaseBrowser()

  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [plates, setPlates] = useState<Plate[]>([])
  const [form, setForm] = useState({
    country_code: '',
    region_code: '',
    year: '',
    serial: '',
    is_public: false
  })
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id ?? null)
      if (data.user) loadMyPlates()
      else loadPublicPlates()
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (uid) loadMyPlates()
      else loadPublicPlates()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadMyPlates() {
    const { data } = await supabase
      .from('plates')
      .select('id,country_code,region_code,year,serial,is_public')
      .order('created_at', { ascending: false })
    setPlates(data ?? [])
  }

  async function loadPublicPlates() {
    const { data } = await supabase
      .from('plates')
      .select('id,country_code,region_code,year,serial,is_public')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20)
    setPlates(data ?? [])
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setMsg(error ? `Error: ${error.message}` : 'Check your email for the magic link.')
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function addPlate(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      setMsg('Please sign in first.')
      return
    }
    const payload = {
      owner_id: userId,
      country_code: form.country_code.trim(),
      region_code: form.region_code.trim() || null,
      year: form.year ? Number(form.year) : null,
      serial: form.serial.trim() || null,
      is_public: form.is_public
    }
    const { error } = await supabase.from('plates').insert(payload)
    if (error) {
      setMsg(`Error: ${error.message}`)
    } else {
      setMsg('Saved ✅')
      setForm({ country_code: '', region_code: '', year: '', serial: '', is_public: false })
      loadMyPlates()
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>Plateapedia (MVP)</h1>

      {!userId ? (
        <section>
          <h2>Sign in</h2>
          <form onSubmit={signInWithEmail} style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ flex: 1, padding: 8 }}
              required
            />
            <button type="submit">Send magic link</button>
          </form>
        </section>
      ) : (
        <section>
          <p>Signed in. <button onClick={signOut}>Sign out</button></p>
          <h2>Add a plate</h2>
          <form onSubmit={addPlate} style={{ display: 'grid', gap: 8 }}>
            <input
              placeholder="Country code (e.g., US, CA, DE)"
              value={form.country_code}
              onChange={(e) => setForm({ ...form, country_code: e.target.value })}
              required
            />
            <input
              placeholder="Region/state (e.g., NY)"
              value={form.region_code}
              onChange={(e) => setForm({ ...form, region_code: e.target.value })}
            />
            <input
              type="number"
              placeholder="Year"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
            <input
              placeholder="Serial"
              value={form.serial}
              onChange={(e) => setForm({ ...form, serial: e.target.value })}
            />
            <label>
              <input
                type="checkbox"
                checked={form.is_public}
                onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
              />{' '}
              Public
            </label>
            <button type="submit">Save plate</button>
          </form>
        </section>
      )}

      <h2 style={{ marginTop: 32 }}>{userId ? 'My plates' : 'Recent public plates'}</h2>
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

      {msg && <p style={{ marginTop: 16 }}>{msg}</p>}
    </main>
  )
}

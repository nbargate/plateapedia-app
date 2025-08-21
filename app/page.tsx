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
type Collection = {
  id: string
  name: string
  description: string | null
}

export default function Home() {
  const supabase = getSupabaseBrowser()

  // --- state ---
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [plates, setPlates] = useState<Plate[]>([])
  const [form, setForm] = useState({
    country_code: '',
    region_code: '',
    year: '',
    serial: '',
    is_public: false,
  })
  const [msg, setMsg] = useState<string | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [newCol, setNewCol] = useState({ name: '', description: '' })
  
  // handle-related state
  const [handle, setHandle] = useState<string>('')
  const [savingHandle, setSavingHandle] = useState(false)

  // --- effects ---
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      setUserId(uid)

      // load handle for this user
      if (uid) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('handle')
          .eq('id', uid)
          .single()
        setHandle(prof?.handle ?? '')
      }

      if (uid) await loadMyPlates()
      else await loadPublicPlates()
      if (uid) await loadCollections()

    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (uid) loadMyPlates()
      else loadPublicPlates()
      if (uid) loadCollections()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // --- helpers ---
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
  async function loadCollections() {
    const { data } = await supabase
      .from('collections')
      .select('id, name, description, owner_id')
      .order('created_at', { ascending: false })
    setCollections(data ?? [])
  }
  async function addCollection(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      setMsg('Please sign in first.')
      return
    }
    const payload = {
      owner_id: userId,
      name: newCol.name.trim(),
      description: newCol.description.trim()
    }
    const { error } = await supabase.from('collections').insert(payload)
    if (error) {
      setMsg(`Error: ${error.message}`)
    } else {
      setMsg('Collection saved ✅')
      setNewCol({ name: '', description: '' })
      loadCollections()
    }
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
      is_public: form.is_public,
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

  async function saveHandle(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    // normalize again on submit (defensive)
    const clean = handle
      .toLowerCase()
      .replace(/\s+/g, '-')      // spaces -> hyphens
      .replace(/[^a-z0-9-]/g, '') // only a–z 0–9 -
      .replace(/-+/g, '-')       // collapse ---
      .replace(/^-+|-+$/g, '')   // trim leading/trailing -

    if (!clean) {
      alert('Please enter a valid handle.')
      return
    }

    setSavingHandle(true)
    const { error } = await supabase
      .from('profiles')
      .update({ handle: clean })
      .eq('id', userId)
    setSavingHandle(false)

    if (error) {
      // Postgres unique violation code
      if ((error as any).code === '23505') {
        alert('That handle is already taken. Try another.')
      } else {
        alert(`Error saving handle: ${error.message}`)
      }
    } else {
      setHandle(clean)
      alert('Handle saved ✅')
    }
  }

  // --- render ---
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
          <p>
            Signed in. <button onClick={signOut}>Sign out</button>
          </p>

          <div style={{ margin: '8px 0 16px 0' }}>
            {handle ? (
              <p style={{ marginBottom: 8 }}>
                Your public page: <a href={`/u/${handle}`}>{`/u/${handle}`}</a>
              </p>
            ) : (
              <p style={{ marginBottom: 8, color: '#666' }}>
                Choose a handle to get your public link.
              </p>
            )}

            <form onSubmit={saveHandle} style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Choose a handle (e.g., nathan)"
                value={handle}
                onChange={(e) => {
                  const raw = e.target.value
                  const cleaned = raw
                    .toLowerCase()
                    .replace(/\s+/g, '-')     // spaces -> hyphens
                    .replace(/[^a-z0-9-]/g, '') // drop invalid chars
                    .replace(/-+/g, '-')      // collapse ---
                    .replace(/^-+|-+$/g, '')  // trim leading/trailing -
                  setHandle(cleaned)
                }}
                style={{ flex: 1, padding: 8 }}
                required
              />
              <button type="submit" disabled={savingHandle}>
                {savingHandle ? 'Saving…' : 'Save handle'}
              </button>
            </form>
          </div>
    <h2>Collections</h2>

    <form onSubmit={addCollection} style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
      <input
        placeholder="Collection name (e.g., 1970s US States)"
        value={newCol.name}
        onChange={(e) => setNewCol({ ...newCol, name: e.target.value })}
        required
      />
      <input
        placeholder="Description (optional)"
        value={newCol.description}
        onChange={(e) => setNewCol({ ...newCol, description: e.target.value })}
      />
      <button type="submit">Create collection</button>
    </form>

    {collections.length === 0 ? (
      <p style={{ color: '#666', marginBottom: 16 }}>No collections yet.</p>
    ) : (
      <ul style={{ marginBottom: 16 }}>
        {collections.map((c) => (
          <li key={c.id}>
            <strong>{c.name}</strong>
            {c.description ? ` — ${c.description}` : ''}
          </li>
        ))}
      </ul>
    )}
              <h2>Collections</h2>

              <form onSubmit={addCollection} style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <input
                  placeholder="Collection name (e.g., 1970s US States)"
                  value={newCol.name}
                  onChange={(e) => setNewCol({ ...newCol, name: e.target.value })}
                  required
                />
                <input
                  placeholder="Description (optional)"
                  value={newCol.description}
                  onChange={(e) => setNewCol({ ...newCol, description: e.target.value })}
                />
                <button type="submit">Create collection</button>
              </form>

              {collections.length === 0 ? (
                <p style={{ color: '#666', marginBottom: 16 }}>No collections yet.</p>
              ) : (
                <ul style={{ marginBottom: 16 }}>
                  {collections.map((c) => (
                    <li key={c.id}>
                      <strong>{c.name}</strong>
                      {c.description ? ` — ${c.description}` : ''}
                    </li>
                  ))}
                </ul>
              )}

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

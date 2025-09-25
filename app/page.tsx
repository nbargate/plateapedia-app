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

  // handle + profiles
  const [handle, setHandle] = useState<string>('')
  const [savingHandle, setSavingHandle] = useState(false)

  // collections
  const [collections, setCollections] = useState<any[]>([])
  const [newCol, setNewCol] = useState({ name: '', description: '' })
  const [selectedCollectionByPlate, setSelectedCollectionByPlate] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id ?? null)
      if (data.user) {
        loadMyPlates()
        loadCollections()
      } else {
        loadPublicPlates()
      }
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        loadMyPlates()
        loadCollections()
      } else {
        loadPublicPlates()
      }
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

  async function loadCollections() {
    if (!userId) return
    const { data } = await supabase
      .from('collections')
      .select('id,name,description')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    setCollections(data ?? [])
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

  async function addCollection(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      setMsg('Please sign in first.')
      return
    }
    const name = newCol.name.trim()
    const description = newCol.description.trim()
    if (!name) return
    const { error } = await supabase.from('collections').insert({
      owner_id: userId,
      name,
      description: description || null,
    })
    if (error) {
      setMsg(`Error creating collection: ${error.message}`)
    } else {
      setMsg('Collection saved ✅')
      setNewCol({ name: '', description: '' })
      loadCollections()
    }
  }

  async function assignPlateToCollection(plateId: string, collectionId: string) {
    const { error } = await supabase.from('plates_collections').insert({
      plate_id: plateId,
      collection_id: collectionId,
    })
    if (error) {
      setMsg(`Error assigning plate: ${error.message}`)
    } else {
      setMsg('Plate added to collection ✅')
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>Plateapedia (MVP)</h1>

      {/* Sign in */}
      {!userId ? (
        <section style={{ marginBottom: 32, paddingBottom: 16, borderBottom: '1px solid #ddd' }}>
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
        <section style={{ marginBottom: 32, paddingBottom: 16, borderBottom: '1px solid #ddd' }}>
          <p>Signed in. <button onClick={signOut}>Sign out</button></p>

          {/* Handle + public link */}
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
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!userId) return
              if (!handle.trim()) return
              setSavingHandle(true)
              const { error } = await supabase
                .from('profiles')
                .update({ handle: handle.trim() })
                .eq('id', userId)
              setSavingHandle(false)
              if (error) alert(`Error saving handle: ${error.message}`)
              else alert('Handle saved ✅')
            }} style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Choose a handle (e.g., nathan)"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                style={{ flex: 1, padding: 8 }}
                required
              />
              <button type="submit" disabled={savingHandle}>
                {savingHandle ? 'Saving…' : 'Save handle'}
              </button>
            </form>
          </div>

          {/* Collections */}
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

          {/* Add a plate */}
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

      {/* Plates list */}
      <section style={{ marginBottom: 32, paddingBottom: 16 }}>
        <h2 style={{ marginTop: 32 }}>{userId ? 'My plates' : 'Recent public plates'}</h2>
        <ul>
          {plates.map((p) => (
            <li key={p.id} style={{ marginBottom: 8 }}>
              <span>
                {p.country_code}
                {p.region_code ? `-${p.region_code}` : ''}
                {p.year ? ` ${p.year}` : ''}
                {p.serial ? ` — ${p.serial}` : ''}
                {p.is_public ? ' (public)' : ''}
              </span>

              {/* Collection assign */}
              {collections.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <select
                    value={selectedCollectionByPlate[p.id] || ''}
                    onChange={(e) =>
                      setSelectedCollectionByPlate({
                        ...selectedCollectionByPlate,
                        [p.id]: e.target.value,
                      })
                    }
                  >
                    <option value="">— Select collection —</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      const colId = selectedCollectionByPlate[p.id]
                      if (!colId) {
                        setMsg('Please choose a collection first.')
                        alert('Please choose a collection first.')
                        return
                      }
                      assignPlateToCollection(p.id, colId)
                    }}
                    style={{ marginLeft: 8 }}
                    disabled={!selectedCollectionByPlate[p.id]}
                  >
                    Add to collection
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {msg && <p style={{ marginTop: 16 }}>{msg}</p>}
    </main>
  )
}
ß
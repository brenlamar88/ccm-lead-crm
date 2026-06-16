import { useState, useEffect } from 'react'
import Nav from '../components/Nav'
import { authedFetch } from '../lib/authedFetch'
import { ContactModal, contactName, TEAL } from '../components/CrmModals'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [companies, setCompanies] = useState([])
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // { contact? } | null

  const isAdmin = me?.role === 'admin'

  useEffect(() => { load(); loadAux() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await authedFetch('/api/contacts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContacts(data.contacts || [])
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const loadAux = async () => {
    try {
      const [cRes, uRes] = await Promise.all([authedFetch('/api/companies'), authedFetch('/api/users')])
      const cData = await cRes.json(); if (cRes.ok) setCompanies((cData.companies || []).map(c => ({ id: c.id, name: c.name })))
      const uData = await uRes.json(); if (uRes.ok) { setUsers(uData.users || []); setMe(uData.me || null) }
    } catch (_) {}
  }

  const remove = async (ct) => {
    if (!window.confirm(`Remove ${contactName(ct)}?`)) return
    try {
      const res = await authedFetch('/api/contacts', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ct.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      load()
    } catch (err) { setError(err.message) }
  }

  const q = search.trim().toLowerCase()
  const filtered = !q ? contacts : contacts.filter(c =>
    [contactName(c), c.title, c.email, c.phone, c.companies?.name].filter(Boolean).some(v => v.toLowerCase().includes(q)))

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Nav active="contacts" isAdmin={isAdmin} />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Contacts</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{contacts.length} {contacts.length === 1 ? 'person' : 'people'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…"
              style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 13, minWidth: 200 }} />
            <button onClick={() => setModal({})} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: TEAL, color: '#fff' }}>＋ Add Contact</button>
          </div>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>⏳ Loading contacts…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>👤</p>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{q ? 'No matches' : 'No contacts yet'}</p>
            <p style={{ color: '#6b7280', fontSize: 13 }}>{q ? 'Try a different search.' : 'Add a contact to get started.'}</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
            {filtered.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid #f1f5f9' : 'none', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>
                    {contactName(c)} {c.is_primary && <span style={{ fontSize: 10, color: '#076e4e', background: '#e6f7f2', padding: '1px 6px', borderRadius: 20, marginLeft: 4 }}>Primary</span>}
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>{[c.title, c.companies?.name].filter(Boolean).join(' · ') || '—'}</p>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  {c.email && <p style={{ fontSize: 12, color: '#374151' }}>✉️ {c.email}</p>}
                  {(c.phone || c.mobile) && <p style={{ fontSize: 12, color: '#6b7280' }}>📞 {c.phone || c.mobile}</p>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setModal({ contact: c })} style={pillBtn('#eff6ff', '#1e40af')}>Edit</button>
                  <button onClick={() => remove(c)} style={pillBtn('#fee2e2', '#991b1b')}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ContactModal
          contact={modal.contact}
          companies={companies}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setModal(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  )
}

function pillBtn(bg, color) {
  return { fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: bg, color, cursor: 'pointer' }
}

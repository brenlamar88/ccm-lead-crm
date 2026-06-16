import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '../components/Nav'
import { authedFetch } from '../lib/authedFetch'
import { CompanyModal, ContactModal, contactName, TEAL, TEAL_DARK } from '../components/CrmModals'

const STATUS_COLORS = {
  'New': '#1e40af', 'Contacted': '#78350f', 'Demo Scheduled': '#6b21a8',
  'Closed Won': '#065f46', 'Closed Lost': '#991b1b',
}

function userName(users, id) {
  if (!id) return ''
  const u = (users || []).find(x => x.id === id)
  return u ? (u.full_name || u.email) : ''
}

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editCompany, setEditCompany] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [contactModal, setContactModal] = useState(null) // { contact?, defaultCompanyId }

  const isAdmin = me?.role === 'admin'
  const detail = companies.find(c => c.id === detailId) || null

  useEffect(() => { load(); loadUsers() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await authedFetch('/api/companies')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCompanies(data.companies || [])
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const loadUsers = async () => {
    try {
      const res = await authedFetch('/api/users')
      const data = await res.json()
      if (res.ok) { setUsers(data.users || []); setMe(data.me || null) }
    } catch (_) {}
  }

  const removeCompany = async (c) => {
    if (!window.confirm(`Delete ${c.name}? Its contacts will be removed; linked deals are kept but unlinked.`)) return
    try {
      const res = await authedFetch('/api/companies', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDetailId(null); load()
    } catch (err) { setError(err.message) }
  }

  const removeContact = async (ct) => {
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
  const filtered = !q ? companies : companies.filter(c =>
    [c.name, c.city, c.state, c.type, c.phone, c.email].filter(Boolean).some(v => v.toLowerCase().includes(q)))

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Nav active="companies" isAdmin={isAdmin} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Companies</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{companies.length} {companies.length === 1 ? 'account' : 'accounts'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies…"
              style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 13, minWidth: 200 }} />
            <button onClick={() => setShowAdd(true)} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: TEAL, color: '#fff' }}>＋ Add Company</button>
          </div>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>⏳ Loading companies…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🏢</p>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{q ? 'No matches' : 'No companies yet'}</p>
            <p style={{ color: '#6b7280', fontSize: 13 }}>{q ? 'Try a different search.' : 'Add a company or generate leads to populate accounts.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filtered.map(c => (
              <div key={c.id} onClick={() => setDetailId(c.id)} style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, cursor: 'pointer',
                transition: 'box-shadow 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{c.name}</p>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                  {[c.type, [c.city, c.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || '—'}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#eff6ff', color: '#1e40af' }}>👤 {(c.contacts || []).length} contacts</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#f5f3ff', color: '#5b21b6' }}>📋 {(c.leads || []).length} deals</span>
                  {c.assigned_to && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#e6f7f2', color: TEAL_DARK }}>{userName(users, c.assigned_to)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <CompanyModal users={users} isAdmin={isAdmin} onClose={() => setShowAdd(false)} onSaved={() => load()} />}
      {editCompany && <CompanyModal company={editCompany} users={users} isAdmin={isAdmin} onClose={() => setEditCompany(null)} onSaved={() => load()} />}
      {contactModal && (
        <ContactModal
          contact={contactModal.contact}
          companies={companies}
          defaultCompanyId={contactModal.defaultCompanyId}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setContactModal(null)}
          onSaved={() => load()}
        />
      )}

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setDetailId(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 640, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{detail.name}</h2>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{[detail.type, [detail.city, detail.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => setDetailId(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={() => setEditCompany(detail)} style={pillBtn('#eff6ff', '#1e40af')}>✎ Edit</button>
              <button onClick={() => setContactModal({ defaultCompanyId: detail.id })} style={pillBtn('#e6f7f2', TEAL_DARK)}>＋ Add contact</button>
              <button onClick={() => removeCompany(detail)} style={pillBtn('#fee2e2', '#991b1b')}>🗑 Delete</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
              {[
                ['Phone', detail.phone], ['Email', detail.email], ['Website', detail.website], ['NPI', detail.npi],
                ['Providers', detail.provider_count], ['Patient volume', detail.patient_volume],
                ['Medicare', detail.medicare_likelihood], ['Fit', detail.fit_score],
                ['Owner', userName(users, detail.assigned_to)], ['Address', detail.address],
              ].map(([k, v]) => v && (
                <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{k}</p>
                  <p style={{ fontSize: 13, color: '#111', wordBreak: 'break-word' }}>{v}</p>
                </div>
              ))}
            </div>
            {detail.notes && <p style={{ fontSize: 13, color: '#374151', background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 18, lineHeight: 1.5 }}>{detail.notes}</p>}

            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Contacts ({(detail.contacts || []).length})</h3>
            <div style={{ marginBottom: 18 }}>
              {(detail.contacts || []).length === 0 ? (
                <p style={{ fontSize: 12, color: '#9ca3af' }}>No contacts yet.</p>
              ) : (
                (detail.contacts || []).map(ct => (
                  <div key={ct.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #f1f5f9', borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>
                        {contactName(ct)} {ct.is_primary && <span style={{ fontSize: 10, color: TEAL_DARK, background: '#e6f7f2', padding: '1px 6px', borderRadius: 20, marginLeft: 4 }}>Primary</span>}
                      </p>
                      <p style={{ fontSize: 11, color: '#6b7280' }}>{[ct.title, ct.email, ct.phone].filter(Boolean).join(' · ')}</p>
                    </div>
                    <button onClick={() => setContactModal({ contact: ct })} style={pillBtn('#eff6ff', '#1e40af')}>Edit</button>
                    <button onClick={() => removeContact(ct)} style={pillBtn('#fee2e2', '#991b1b')}>Remove</button>
                  </div>
                ))
              )}
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Pipeline deals ({(detail.leads || []).length})</h3>
            {(detail.leads || []).length === 0 ? (
              <p style={{ fontSize: 12, color: '#9ca3af' }}>No linked deals.</p>
            ) : (
              <div>
                {(detail.leads || []).map(d => (
                  <Link key={d.id} href="/pipeline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #f1f5f9', borderRadius: 8, marginBottom: 6, textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ fontSize: 13 }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[d.status] || '#6b7280' }}>{d.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function pillBtn(bg, color) {
  return { fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: bg, color, cursor: 'pointer' }
}

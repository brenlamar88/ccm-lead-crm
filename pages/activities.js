import { useState, useEffect } from 'react'
import Nav from '../components/Nav'
import { authedFetch } from '../lib/authedFetch'
import { ActivityForm, ActivityList, ACTIVITY_TYPES, TEAL } from '../components/activities'

export default function Activities() {
  const [activities, setActivities] = useState([])
  const [leads, setLeads] = useState([])
  const [companies, setCompanies] = useState([])
  const [contacts, setContacts] = useState([])
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  // Filters
  const [rep, setRep] = useState('all')
  const [type, setType] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dueOnly, setDueOnly] = useState(false)

  const isAdmin = me?.role === 'admin'
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => { load(); loadAux() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await authedFetch('/api/activities')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setActivities(data.activities || [])
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const loadAux = async () => {
    try {
      const [lRes, cRes, ctRes, uRes] = await Promise.all([
        authedFetch('/api/leads'), authedFetch('/api/companies'), authedFetch('/api/contacts'), authedFetch('/api/users'),
      ])
      const lData = await lRes.json(); if (lRes.ok) setLeads((lData.leads || []).map(l => ({ id: l.id, name: l.name })))
      const cData = await cRes.json(); if (cRes.ok) setCompanies((cData.companies || []).map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)))
      const ctData = await ctRes.json(); if (ctRes.ok) setContacts(ctData.contacts || [])
      const uData = await uRes.json(); if (uRes.ok) { setUsers(uData.users || []); setMe(uData.me || null) }
    } catch (_) {}
  }

  const onSaved = () => { setShowAdd(false); setEditing(null); load() }
  const onDelete = async (a) => {
    if (!window.confirm('Delete this activity?')) return
    const res = await authedFetch('/api/activities', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id }) })
    if (res.ok) setActivities(prev => prev.filter(x => x.id !== a.id))
  }

  const filtered = activities.filter(a => {
    if (rep !== 'all' && a.rep_id !== rep) return false
    if (type !== 'all' && a.type !== type) return false
    const d = a.occurred_at ? a.occurred_at.slice(0, 10) : ''
    if (from && d < from) return false
    if (to && d > to) return false
    if (dueOnly && !(a.followup_date && !a.followup_done && a.followup_date <= today)) return false
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav active="activities" isAdmin={isAdmin} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Activity Log</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>{filtered.length} of {activities.length} contacts</p>
          </div>
          <button onClick={() => { setShowAdd(s => !s); setEditing(null) }} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: TEAL, color: '#fff' }}>
            {showAdd ? '✕ Cancel' : '＋ Log Contact'}
          </button>
        </div>

        {(showAdd || editing) && (
          <div style={{ marginBottom: 16 }}>
            <ActivityForm activity={editing} leads={leads} companies={companies} contacts={contacts} onSaved={onSaved} onCancel={() => { setShowAdd(false); setEditing(null) }} />
          </div>
        )}

        {/* Filters */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={rep} onChange={e => setRep(e.target.value)} style={sel}>
            <option value="all">All reps</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value)} style={sel}>
            <option value="all">All types</option>
            {ACTIVITY_TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.key}</option>)}
          </select>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={sel} /></label>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>To <input type="date" value={to} onChange={e => setTo(e.target.value)} style={sel} /></label>
          <label style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={dueOnly} onChange={e => setDueOnly(e.target.checked)} /> Due follow-ups
          </label>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>⏳ Loading activity…</div>
        ) : (
          <ActivityList
            activities={filtered}
            users={users}
            showLead
            onEdit={a => { setEditing(a); setShowAdd(false) }}
            onDelete={onDelete}
            emptyText="No activity matches these filters."
          />
        )}
      </div>
    </div>
  )
}

const sel = { padding: '7px 10px', borderRadius: 9, border: '1px solid var(--line-strong)', fontSize: 13 }

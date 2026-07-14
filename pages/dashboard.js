import { useState, useEffect } from 'react'
import Nav from '../components/Nav'
import { authedFetch } from '../lib/authedFetch'
import { ACTIVITY_TYPES, typeStyle, repName, TEAL, TEAL_DARK } from '../components/activities'

const OPEN = ['New', 'Contacted', 'Demo Scheduled']

function todayStr() { return new Date().toISOString().slice(0, 10) }
function daysAgoStr(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
function eachDay(from, to) {
  const out = []
  const d = new Date(from + 'T00:00:00'), end = new Date(to + 'T00:00:00')
  let guard = 0
  while (d <= end && guard < 400) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); guard++ }
  return out
}

export default function Dashboard() {
  const [activities, setActivities] = useState([])
  const [leads, setLeads] = useState([])
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rep, setRep] = useState('all')
  const [from, setFrom] = useState(todayStr())
  const [to, setTo] = useState(todayStr())

  const isAdmin = me?.role === 'admin'
  const today = todayStr()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [aRes, lRes, uRes] = await Promise.all([
        authedFetch('/api/activities'), authedFetch('/api/leads'), authedFetch('/api/users'),
      ])
      const aData = await aRes.json(); if (aRes.ok) setActivities(aData.activities || [])
      const lData = await lRes.json(); if (lRes.ok) setLeads(lData.leads || [])
      const uData = await uRes.json(); if (uRes.ok) { setUsers(uData.users || []); setMe(uData.me || null) }
    } finally { setLoading(false) }
  }

  const preset = (n) => { setFrom(daysAgoStr(n)); setTo(today) }

  const inRange = activities.filter(a => {
    if (rep !== 'all' && a.rep_id !== rep) return false
    const d = a.occurred_at ? a.occurred_at.slice(0, 10) : ''
    return d >= from && d <= to
  })

  const repLeads = leads.filter(l => rep === 'all' || l.assigned_to === rep)

  // KPIs
  const totalContacts = inRange.length
  const uniqueLeads = new Set(inRange.map(a => a.lead_id).filter(Boolean)).size
  const dueFollowups = repLeads.length && activities.filter(a =>
    (rep === 'all' || a.rep_id === rep) && a.followup_date && !a.followup_done && a.followup_date <= to && a.followup_date >= from).length
  const overdue = activities.filter(a =>
    (rep === 'all' || a.rep_id === rep) && a.followup_date && !a.followup_done && a.followup_date < today).length

  const byType = ACTIVITY_TYPES.map(t => ({ ...t, count: inRange.filter(a => a.type === t.key).length })).filter(t => t.count > 0)

  const days = eachDay(from, to)
  const perDay = days.map(d => ({ d, count: inRange.filter(a => (a.occurred_at || '').slice(0, 10) === d).length }))
  const maxDay = Math.max(1, ...perDay.map(p => p.count))

  // Per-rep leaderboard (when viewing all)
  const perRep = users.map(u => ({
    u,
    contacts: inRange.filter(a => a.rep_id === u.id).length,
    leads: new Set(inRange.filter(a => a.rep_id === u.id).map(a => a.lead_id)).size,
  })).filter(r => r.contacts > 0).sort((a, b) => b.contacts - a.contacts)

  // Pipeline snapshot (current)
  const openCount = repLeads.filter(l => OPEN.includes(l.status)).length
  const wonCount = repLeads.filter(l => l.status === 'Closed Won').length
  const lostCount = repLeads.filter(l => l.status === 'Closed Lost').length

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Nav active="dashboard" isAdmin={isAdmin} />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{from === to ? from : `${from} → ${to}`}{rep !== 'all' ? ` · ${repName(users, rep)}` : ' · all reps'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={rep} onChange={e => setRep(e.target.value)} style={sel}>
              <option value="all">All reps</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={sel} />
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={sel} />
            {[['Today', 0], ['7d', 6], ['30d', 29]].map(([lbl, n]) => (
              <button key={lbl} onClick={() => preset(n)} style={presetBtn}>{lbl}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#6b7280' }}>⏳ Loading…</div>
        ) : (
          <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
              {[
                ['Contacts', totalContacts, TEAL_DARK, '#e6f7f2'],
                ['Leads worked', uniqueLeads, '#1e40af', '#eff6ff'],
                ['Follow-ups due', dueFollowups || 0, '#9a3412', '#fff7ed'],
                ['Overdue', overdue, '#991b1b', '#fee2e2'],
              ].map(([label, val, color, bg]) => (
                <div key={label} style={{ background: bg, borderRadius: 12, padding: '14px 16px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color }}>{val}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {/* Per-day activity */}
              <Card title="Contacts by day">
                {perDay.map(p => (
                  <div key={p.d} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: '#6b7280', width: 78 }}>{p.d.slice(5)}</span>
                    <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 16, overflow: 'hidden' }}>
                      <div style={{ width: `${(p.count / maxDay) * 100}%`, background: TEAL, height: '100%' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, width: 24, textAlign: 'right' }}>{p.count}</span>
                  </div>
                ))}
              </Card>

              {/* By type */}
              <Card title="By contact type">
                {byType.length === 0 ? <p style={{ fontSize: 12, color: '#9ca3af' }}>No contacts in range.</p> : byType.map(t => (
                  <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: t.bg, color: t.text, width: 96 }}>{t.emoji} {t.key}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{t.count}</span>
                  </div>
                ))}
              </Card>

              {/* Pipeline snapshot */}
              <Card title="Pipeline (current)">
                <Row label="Open" value={openCount} color="#1e40af" />
                <Row label="Won" value={wonCount} color="#065f46" />
                <Row label="Lost" value={lostCount} color="#991b1b" />
              </Card>

              {/* Per-rep leaderboard */}
              {rep === 'all' && (
                <Card title="By rep">
                  {perRep.length === 0 ? <p style={{ fontSize: 12, color: '#9ca3af' }}>No contacts in range.</p> : perRep.map(r => (
                    <div key={r.u.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span>{r.u.full_name || r.u.email}</span>
                      <span style={{ color: '#6b7280' }}>{r.contacts} contacts · {r.leads} leads</span>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{title}</p>
      {children}
    </div>
  )
}
function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
      <span>{label}</span><span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

const sel = { padding: '7px 10px', borderRadius: 9, border: '1px solid #d1d5db', fontSize: 13 }
const presetBtn = { padding: '7px 12px', borderRadius: 9, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }

import { useState, useEffect } from 'react'
import Nav from '../components/Nav'
import { authedFetch } from '../lib/authedFetch'
import { TEAL, TEAL_DARK } from '../components/activities'

// Monday of the week containing date d.
function weekStart(d) {
  const x = new Date(d + 'T00:00:00')
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  return x
}
function fmt(d) { return d.toISOString().slice(0, 10) }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function todayStr() { return new Date().toISOString().slice(0, 10) }

function csvCell(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function Reports() {
  const [activities, setActivities] = useState([])
  const [leads, setLeads] = useState([])
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [anchor, setAnchor] = useState(todayStr())

  const isAdmin = me?.role === 'admin'

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

  const start = weekStart(anchor)
  const startStr = fmt(start)
  const endStr = fmt(addDays(start, 6))
  const inWeek = (dateStr) => dateStr && dateStr >= startStr && dateStr <= endStr

  const weekActs = activities.filter(a => inWeek((a.occurred_at || '').slice(0, 10)))

  // One row per rep who has assigned leads or logged activity.
  const relevantRepIds = new Set([
    ...users.map(u => u.id),
  ])
  const rows = users.filter(u => relevantRepIds.has(u.id)).map(u => {
    const acts = weekActs.filter(a => a.rep_id === u.id)
    const myLeads = leads.filter(l => l.assigned_to === u.id)
    const count = (type) => acts.filter(a => a.type === type).length
    return {
      rep: u.full_name || u.email,
      total: acts.length,
      calls: count('Call'),
      emails: count('Email'),
      texts: count('Text'),
      meetings: count('Meeting'),
      other: acts.filter(a => ['Voicemail', 'LinkedIn', 'Other'].includes(a.type)).length,
      leadsWorked: new Set(acts.map(a => a.lead_id).filter(Boolean)).size,
      followupsSet: acts.filter(a => a.followup_date).length,
      wonThisWeek: myLeads.filter(l => l.status === 'Closed Won' && inWeek((l.status_changed_at || '').slice(0, 10))).length,
      lostThisWeek: myLeads.filter(l => l.status === 'Closed Lost' && inWeek((l.status_changed_at || '').slice(0, 10))).length,
      openPipeline: myLeads.filter(l => ['New', 'Contacted', 'Demo Scheduled'].includes(l.status)).length,
    }
  }).filter(r => r.total > 0 || r.openPipeline > 0)

  const COLS = [
    ['Rep', r => r.rep], ['Contacts', r => r.total], ['Calls', r => r.calls], ['Emails', r => r.emails],
    ['Texts', r => r.texts], ['Meetings', r => r.meetings], ['Other', r => r.other],
    ['Leads worked', r => r.leadsWorked], ['Follow-ups set', r => r.followupsSet],
    ['Won', r => r.wonThisWeek], ['Lost', r => r.lostThisWeek], ['Open pipeline', r => r.openPipeline],
  ]

  const exportCsv = () => {
    const header = COLS.map(c => csvCell(c[0])).join(',')
    const body = rows.map(r => COLS.map(c => csvCell(c[1](r))).join(','))
    const csv = '﻿' + [header, ...body].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `sdr-report-${startStr}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Nav active="reports" isAdmin={isAdmin} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Weekly SDR Report</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>Week of {startStr} → {endStr}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setAnchor(fmt(addDays(start, -7)))} style={navBtn}>← Prev</button>
            <input type="date" value={anchor} onChange={e => setAnchor(e.target.value)} style={sel} />
            <button onClick={() => setAnchor(fmt(addDays(start, 7)))} style={navBtn}>Next →</button>
            <button onClick={exportCsv} disabled={rows.length === 0} style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: rows.length ? TEAL : '#9ca3af', color: '#fff', fontSize: 13, fontWeight: 700, cursor: rows.length ? 'pointer' : 'default' }}>⬇ CSV</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#6b7280' }}>⏳ Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📊</p>
            <p style={{ fontWeight: 700 }}>No activity for this week</p>
            <p style={{ color: '#6b7280', fontSize: 13 }}>Pick another week or log some contacts.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {COLS.map((c, i) => (
                    <th key={c[0]} style={{ textAlign: i === 0 ? 'left' : 'center', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{c[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={r.rep} style={{ borderTop: '1px solid #f1f5f9' }}>
                    {COLS.map((c, i) => (
                      <td key={c[0]} style={{ textAlign: i === 0 ? 'left' : 'center', padding: '10px 12px', fontWeight: i === 0 ? 600 : 400 }}>{c[1](r)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const sel = { padding: '7px 10px', borderRadius: 9, border: '1px solid #d1d5db', fontSize: 13 }
const navBtn = { padding: '7px 12px', borderRadius: 9, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }

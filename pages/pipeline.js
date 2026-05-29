import { useState, useEffect } from 'react'
import Link from 'next/link'

const TEAL = '#0d9e72'
const TEAL_LIGHT = '#e6f7f2'
const TEAL_DARK = '#076e4e'

const STATUSES = ['New', 'Contacted', 'Demo Scheduled', 'Closed Won', 'Closed Lost']

const STATUS_STYLES = {
  'New':            { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', emoji: '🆕' },
  'Contacted':      { bg: '#fef3c7', text: '#78350f', border: '#fde68a', emoji: '📞' },
  'Demo Scheduled': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe', emoji: '📅' },
  'Closed Won':     { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7', emoji: '🏆' },
  'Closed Lost':    { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5', emoji: '❌' },
}

function fitColors(score) {
  if (score === 'High') return { bg: '#d1fae5', text: '#065f46' }
  if (score === 'Medium') return { bg: '#fef3c7', text: '#78350f' }
  return { bg: '#fee2e2', text: '#7f1d1d' }
}

function LeadModal({ lead, onClose, onUpdate }) {
  const [status, setStatus] = useState(lead.status || 'New')
  const [notes, setNotes] = useState(lead.notes || '')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onUpdate(lead.id, { status, notes })
    setSaving(false)
    onClose()
  }

  const copy = () => {
    navigator.clipboard.writeText(lead.outreach_email || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, flex: 1, marginRight: 12 }}>{lead.name}</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ ...fitColors(lead.fit_score), fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: fitColors(lead.fit_score).bg, color: fitColors(lead.fit_score).text }}>{lead.fit_score} fit</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#eff6ff', color: '#1e40af' }}>Medicare: {lead.medicare_likelihood}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            ['Contact', lead.decision_maker],
            ['Providers', `${lead.provider_count} providers`],
            ['Volume', lead.patient_volume],
            ['Phone', lead.phone],
          ].map(([k, v]) => v && (
            <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{k}</p>
              <p style={{ fontSize: 13, color: '#111' }}>{v}</p>
            </div>
          ))}
        </div>

        {lead.address && <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>📍 {lead.address}</p>}
        {lead.npi && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#1e40af', padding: '2px 7px', borderRadius: 20 }}>NPI {lead.npi}</span>
            <a href={`https://npiregistry.cms.hhs.gov/provider-view/${lead.npi}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#0d9e72', fontWeight: 600 }}>✓ Verify on CMS registry ↗</a>
          </div>
        )}
        {lead.fit_rationale && <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 16, background: '#f8fafc', padding: '10px 12px', borderRadius: 8 }}>{lead.fit_rationale}</p>}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pipeline status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Call notes, next steps, contacts…" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical' }} />
        </div>

        {lead.outreach_email && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Outreach email</p>
            <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{lead.outreach_email}</p>
            <button onClick={copy} style={{
              marginTop: 10, background: copied ? TEAL : '#fff', color: copied ? '#fff' : '#374151',
              border: '1px solid #d1d5db', borderRadius: 8, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 500
            }}>{copied ? '✓ Copied!' : 'Copy email'}</button>
          </div>
        )}

        {lead.lead_runs && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>
            From: {lead.lead_runs.city}, {lead.lead_runs.state} · {new Date(lead.lead_runs.created_at).toLocaleDateString()}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={saving} style={{
            flex: 1, padding: 12, background: TEAL, color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer'
          }}>{saving ? 'Saving…' : '💾 Save changes'}</button>
          <button onClick={onClose} style={{
            padding: '12px 16px', background: '#f1f5f9', border: 'none',
            borderRadius: 10, fontSize: 14, color: '#374151', cursor: 'pointer', fontWeight: 600
          }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function KanbanCard({ lead, onClick, onStatusChange }) {
  const ss = STATUS_STYLES[lead.status] || STATUS_STYLES['New']
  const fc = fitColors(lead.fit_score)
  return (
    <div onClick={onClick} style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
      transition: 'box-shadow 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
    >
      <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, lineHeight: 1.3 }}>{lead.name}</p>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: fc.bg, color: fc.text }}>{lead.fit_score} fit</span>
        <span style={{ fontSize: 10, color: '#6b7280' }}>Medicare: {lead.medicare_likelihood}</span>
      </div>
      <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>👨‍⚕️ {lead.provider_count} · {lead.decision_maker}</p>
      {lead.notes && <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', borderTop: '1px solid #f1f5f9', paddingTop: 6, marginTop: 4 }}>{lead.notes.slice(0, 60)}{lead.notes.length > 60 ? '…' : ''}</p>}

      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
        {STATUSES.filter(s => s !== lead.status).slice(0, 2).map(s => (
          <button key={s} onClick={() => onStatusChange(lead.id, s)} style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, cursor: 'pointer',
            background: '#f8fafc', border: '1px solid #e5e7eb', color: '#6b7280'
          }}>→ {s}</button>
        ))}
      </div>
    </div>
  )
}

export default function Pipeline() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => { fetchLeads() }, [])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLeads(data.leads || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateLead = async (id, updates) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredLeads = filter === 'all' ? leads : leads.filter(l => l.fit_score === filter)
  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = filteredLeads.filter(l => l.status === s)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: TEAL, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏥</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>CCM Lead CRM</span>
          <span style={{ fontSize: 11, color: '#6b7280', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>Anchored Health</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Link href="/" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#6b7280' }}>Generate</Link>
          <Link href="/pipeline" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: TEAL_LIGHT, color: TEAL_DARK }}>Pipeline</Link>
        </div>
      </nav>

      <div style={{ padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Lead Pipeline</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{leads.length} total leads across {Object.values(byStatus).filter(a => a.length > 0).length} stages</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'High', 'Medium'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${filter === f ? TEAL : '#d1d5db'}`,
                background: filter === f ? TEAL_LIGHT : '#fff',
                color: filter === f ? TEAL_DARK : '#6b7280'
              }}>{f === 'all' ? 'All leads' : `${f} fit only`}</button>
            ))}
          </div>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>⏳</p>
            <p>Loading pipeline…</p>
          </div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🏥</p>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No leads yet</p>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Generate your first batch of CCM prospects to get started.</p>
            <Link href="/" style={{ padding: '10px 24px', background: TEAL, color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>Generate leads →</Link>
          </div>
        ) : (
          /* Kanban board */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'start' }}>
            {STATUSES.map(status => {
              const ss = STATUS_STYLES[status]
              const colLeads = byStatus[status] || []
              return (
                <div key={status}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>{ss.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{status}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                      background: ss.bg, color: ss.text, border: `1px solid ${ss.border}`
                    }}>{colLeads.length}</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 12, padding: '10px', minHeight: 100 }}>
                    {colLeads.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>No leads</p>
                    ) : (
                      colLeads.map(lead => (
                        <KanbanCard
                          key={lead.id}
                          lead={lead}
                          onClick={() => setSelected(lead)}
                          onStatusChange={(id, newStatus) => updateLead(id, { status: newStatus })}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <LeadModal
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdate={async (id, updates) => {
            await updateLead(id, updates)
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

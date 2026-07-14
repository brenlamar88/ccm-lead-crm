import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { authedFetch } from '../lib/authedFetch'
import Nav from '../components/Nav'
import { LeadActivity } from '../components/activities'

const TEAL = '#0d9e72'
const TEAL_LIGHT = '#e6f7f2'
const TEAL_DARK = '#076e4e'

const STATUSES = ['New', 'Contacted', 'Demo Scheduled', 'Closed Won', 'Closed Lost']
const OPEN_STATUSES = ['New', 'Contacted', 'Demo Scheduled']
const CLOSED_STATUSES = ['Closed Won', 'Closed Lost']
const DIRECTIONS = ['Inbound', 'Outbound']
const TEMPERATURES = ['Cold', 'Warm', 'Hot']

const STATUS_STYLES = {
  'New':            { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', emoji: '🆕' },
  'Contacted':      { bg: '#fef3c7', text: '#78350f', border: '#fde68a', emoji: '📞' },
  'Demo Scheduled': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe', emoji: '📅' },
  'Closed Won':     { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7', emoji: '🏆' },
  'Closed Lost':    { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5', emoji: '❌' },
}

const DIR_STYLES = {
  'Inbound':  { bg: '#ecfdf5', text: '#065f46', emoji: '📥' },
  'Outbound': { bg: '#f5f3ff', text: '#5b21b6', emoji: '📤' },
}

const TEMP_STYLES = {
  'Cold': { bg: '#eff6ff', text: '#1e40af', emoji: '🧊' },
  'Warm': { bg: '#fff7ed', text: '#9a3412', emoji: '🌤️' },
  'Hot':  { bg: '#fee2e2', text: '#991b1b', emoji: '🔥' },
}

function fitColors(score) {
  if (score === 'High') return { bg: '#d1fae5', text: '#065f46' }
  if (score === 'Medium') return { bg: '#fef3c7', text: '#78350f' }
  return { bg: '#fee2e2', text: '#7f1d1d' }
}

// Resolve a user id to a display name from the loaded users list.
function userName(users, id) {
  if (!id) return ''
  const u = (users || []).find(x => x.id === id)
  return u ? (u.full_name || u.email) : ''
}

// CSV export — columns in a sensible outreach order. Opens cleanly in Excel/Sheets.
const EXPORT_COLUMNS = [
  ['Name', l => l.name],
  ['Company', l => l.companies?.name],
  ['Direction', l => l.direction],
  ['Temperature', l => l.temperature],
  ['Fit Score', l => l.fit_score],
  ['Medicare Likelihood', l => l.medicare_likelihood],
  ['Status', l => l.status],
  ['Open/Closed', l => (CLOSED_STATUSES.includes(l.status) ? 'Closed' : 'Open')],
  ['Decision Maker', l => l.decision_maker],
  ['Providers', l => l.provider_count],
  ['Patient Volume', l => l.patient_volume],
  ['Phone', l => l.phone],
  ['Email', l => l.email],
  ['Website', l => l.website],
  ['Address', l => l.address],
  ['NPI', l => l.npi],
  ['Assigned To', l => l._assignee],
  ['Market', l => (l.lead_runs ? `${l.lead_runs.city}, ${l.lead_runs.state}` : '')],
  ['Fit Rationale', l => l.fit_rationale],
  ['Notes', l => l.notes],
  ['Outreach Email', l => l.outreach_email],
  ['Created', l => (l.created_at ? new Date(l.created_at).toLocaleString() : '')],
]

function csvCell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Quote if it contains characters that would break CSV parsing.
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function exportLeadsToCsv(leads) {
  const header = EXPORT_COLUMNS.map(([label]) => csvCell(label)).join(',')
  const rows = leads.map(l => EXPORT_COLUMNS.map(([, get]) => csvCell(get(l))).join(','))
  // Prepend BOM so Excel reads UTF-8 correctly.
  const csv = '﻿' + [header, ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ccm-leads-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function Pill({ style, children }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: style.bg, color: style.text }}>
      {children}
    </span>
  )
}

const fieldLabel = { fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }
const fieldInput = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }

function LeadModal({ lead, onClose, onUpdate, users, companies, isAdmin }) {
  const [status, setStatus] = useState(lead.status || 'New')
  const [direction, setDirection] = useState(lead.direction || 'Outbound')
  const [temperature, setTemperature] = useState(lead.temperature || 'Cold')
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to || '')
  const [companyId, setCompanyId] = useState(lead.company_id || '')
  const [contactId, setContactId] = useState(lead.contact_id || '')
  const [companyContacts, setCompanyContacts] = useState([])
  const [notes, setNotes] = useState(lead.notes || '')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load the chosen company's contacts so a primary contact can be picked.
  useEffect(() => {
    if (!companyId) { setCompanyContacts([]); return }
    let active = true
    authedFetch(`/api/contacts?company_id=${companyId}`)
      .then(r => r.ok ? r.json() : { contacts: [] })
      .then(d => { if (active) setCompanyContacts(d.contacts || []) })
      .catch(() => {})
    return () => { active = false }
  }, [companyId])

  const save = async () => {
    setSaving(true)
    const updates = { status, direction, temperature, notes, company_id: companyId || null, contact_id: contactId || null }
    // Only admins may change assignment; include the field only when allowed.
    if (isAdmin) updates.assigned_to = assignedTo || null
    await onUpdate(lead.id, updates)
    setSaving(false)
    onClose()
  }

  const onCompanyChange = (val) => { setCompanyId(val); setContactId('') }

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
          <Pill style={DIR_STYLES[direction] || DIR_STYLES['Outbound']}>{DIR_STYLES[direction]?.emoji} {direction}</Pill>
          <Pill style={TEMP_STYLES[temperature] || TEMP_STYLES['Cold']}>{TEMP_STYLES[temperature]?.emoji} {temperature}</Pill>
          {lead.fit_score && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: fitColors(lead.fit_score).bg, color: fitColors(lead.fit_score).text }}>{lead.fit_score} fit</span>}
          {lead.medicare_likelihood && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#eff6ff', color: '#1e40af' }}>Medicare: {lead.medicare_likelihood}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            ['Contact', lead.decision_maker],
            ['Providers', lead.provider_count ? `${lead.provider_count} providers` : null],
            ['Volume', lead.patient_volume],
            ['Phone', lead.phone],
            ['Email', lead.email],
            ['Website', lead.website],
          ].map(([k, v]) => v && (
            <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{k}</p>
              <p style={{ fontSize: 13, color: '#111', wordBreak: 'break-word' }}>{v}</p>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <label style={fieldLabel}>Stage</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={fieldInput}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Direction</label>
            <select value={direction} onChange={e => setDirection(e.target.value)} style={fieldInput}>
              {DIRECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Temp</label>
            <select value={temperature} onChange={e => setTemperature(e.target.value)} style={fieldInput}>
              {TEMPERATURES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>Assigned to {!isAdmin && <span style={{ textTransform: 'none', fontWeight: 500, color: '#9ca3af' }}>· admin only</span>}</label>
          {isAdmin ? (
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={fieldInput}>
              <option value="">— Unassigned —</option>
              {(users || []).map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
          ) : (
            <p style={{ fontSize: 13, color: '#374151', background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
              {userName(users, lead.assigned_to) || 'Unassigned'}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <label style={fieldLabel}>Company</label>
            <select value={companyId} onChange={e => onCompanyChange(e.target.value)} style={fieldInput}>
              <option value="">— None —</option>
              {(companies || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Primary contact</label>
            <select value={contactId} onChange={e => setContactId(e.target.value)} style={fieldInput} disabled={!companyId}>
              <option value="">{companyId ? '— None —' : 'Pick a company first'}</option>
              {companyContacts.map(ct => {
                const n = `${ct.first_name || ''} ${ct.last_name || ''}`.trim() || ct.title || ct.email || 'Contact'
                return <option key={ct.id} value={ct.id}>{n}</option>
              })}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Call notes, next steps, contacts…" style={{ ...fieldInput, fontSize: 13, resize: 'vertical' }} />
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

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>📇 Contact activity</p>
          <LeadActivity leadId={lead.id} />
        </div>

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

const EMPTY_LEAD = {
  name: '', decision_maker: '', phone: '', email: '', website: '', address: '',
  direction: 'Inbound', temperature: 'Warm', status: 'New',
  fit_score: 'Medium', medicare_likelihood: 'Medium', provider_count: '', patient_volume: '', notes: '',
}

function NewLeadModal({ onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY_LEAD)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setError(''); setSaving(true)
    const payload = { ...form, provider_count: form.provider_count ? parseInt(form.provider_count) : null }
    const err = await onCreate(payload)
    setSaving(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Add a lead</h2>
          <button type="button" onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabel}>Practice / lead name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Bayou Family Medicine" style={fieldInput} autoFocus />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={fieldLabel}>Direction</label>
            <select value={form.direction} onChange={e => set('direction', e.target.value)} style={fieldInput}>
              {DIRECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Temp</label>
            <select value={form.temperature} onChange={e => set('temperature', e.target.value)} style={fieldInput}>
              {TEMPERATURES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Stage</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={fieldInput}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={fieldLabel}>Contact / decision maker</label>
            <input value={form.decision_maker} onChange={e => set('decision_maker', e.target.value)} placeholder="e.g. Office Manager" style={fieldInput} />
          </div>
          <div>
            <label style={fieldLabel}>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 123-4567" style={fieldInput} />
          </div>
          <div>
            <label style={fieldLabel}>Email</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@practice.com" style={fieldInput} />
          </div>
          <div>
            <label style={fieldLabel}>Website</label>
            <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="practice.com" style={fieldInput} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabel}>Address</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, City, ST" style={fieldInput} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={fieldLabel}>Fit score</label>
            <select value={form.fit_score} onChange={e => set('fit_score', e.target.value)} style={fieldInput}>
              {['High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Medicare</label>
            <select value={form.medicare_likelihood} onChange={e => set('medicare_likelihood', e.target.value)} style={fieldInput}>
              {['High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Providers</label>
            <input type="number" min="0" value={form.provider_count} onChange={e => set('provider_count', e.target.value)} placeholder="#" style={fieldInput} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="How did this lead come in? Next steps…" style={{ ...fieldInput, fontSize: 13, resize: 'vertical' }} />
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{
            flex: 1, padding: 12, background: TEAL, color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer'
          }}>{saving ? 'Saving…' : '＋ Add lead'}</button>
          <button type="button" onClick={onClose} style={{
            padding: '12px 16px', background: '#f1f5f9', border: 'none',
            borderRadius: 10, fontSize: 14, color: '#374151', cursor: 'pointer', fontWeight: 600
          }}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

function KanbanCard({ lead, onClick, onStatusChange, users }) {
  const fc = fitColors(lead.fit_score)
  const dir = DIR_STYLES[lead.direction] || DIR_STYLES['Outbound']
  const temp = TEMP_STYLES[lead.temperature] || TEMP_STYLES['Cold']
  const assignee = userName(users, lead.assigned_to)
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
        <Pill style={dir}>{dir.emoji} {lead.direction || 'Outbound'}</Pill>
        <Pill style={temp}>{temp.emoji} {lead.temperature || 'Cold'}</Pill>
        {lead.fit_score && <Pill style={fc}>{lead.fit_score} fit</Pill>}
      </div>
      <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
        {lead.provider_count ? `👨‍⚕️ ${lead.provider_count} · ` : ''}{lead.decision_maker || '—'}
      </p>
      <p style={{ fontSize: 11, color: assignee ? '#0d9e72' : '#9ca3af', fontWeight: assignee ? 600 : 400, marginBottom: 6 }}>
        {assignee ? `👤 ${assignee}` : '○ Unassigned'}
      </p>
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

function FilterRow({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 64 }}>{label}</span>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          border: `1px solid ${value === opt.value ? TEAL : '#d1d5db'}`,
          background: value === opt.value ? TEAL_LIGHT : '#fff',
          color: value === opt.value ? TEAL_DARK : '#6b7280'
        }}>{opt.label}</button>
      ))}
    </div>
  )
}

export default function Pipeline() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [fitFilter, setFitFilter] = useState('all')
  const [dirFilter, setDirFilter] = useState('all')
  const [tempFilter, setTempFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [companies, setCompanies] = useState([])
  const [error, setError] = useState('')

  const isAdmin = me?.role === 'admin'

  useEffect(() => { fetchLeads(); fetchUsers(); fetchCompanies() }, [])

  const fetchCompanies = async () => {
    try {
      const res = await authedFetch('/api/companies')
      const data = await res.json()
      if (res.ok) setCompanies((data.companies || []).map(c => ({ id: c.id, name: c.name })))
    } catch (_) { /* best-effort */ }
  }

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const res = await authedFetch('/api/leads')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLeads(data.leads || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await authedFetch('/api/users')
      const data = await res.json()
      if (res.ok) { setUsers(data.users || []); setMe(data.me || null) }
    } catch (_) { /* assignee names are best-effort */ }
  }

  const updateLead = async (id, updates) => {
    try {
      const res = await authedFetch('/api/leads', {
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

  // Returns an error string on failure, undefined on success.
  const createLead = async (lead) => {
    try {
      const res = await authedFetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true, lead }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLeads(prev => [data.lead, ...prev])
    } catch (err) {
      return err.message
    }
  }

  const filteredLeads = leads.filter(l =>
    (fitFilter === 'all' || l.fit_score === fitFilter) &&
    (dirFilter === 'all' || (l.direction || 'Outbound') === dirFilter) &&
    (tempFilter === 'all' || (l.temperature || 'Cold') === tempFilter) &&
    (assigneeFilter === 'all' ||
      (assigneeFilter === 'unassigned' ? !l.assigned_to : l.assigned_to === assigneeFilter))
  )

  // Enrich rows with a resolved assignee name for CSV export.
  const exportRows = filteredLeads.map(l => ({ ...l, _assignee: userName(users, l.assigned_to) }))

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = filteredLeads.filter(l => l.status === s)
    return acc
  }, {})

  const openCount = filteredLeads.filter(l => OPEN_STATUSES.includes(l.status)).length
  const closedCount = filteredLeads.filter(l => CLOSED_STATUSES.includes(l.status)).length
  const wonCount = filteredLeads.filter(l => l.status === 'Closed Won').length
  const lostCount = filteredLeads.filter(l => l.status === 'Closed Lost').length

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Nav active="pipeline" isAdmin={isAdmin} />

      <div style={{ padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Lead Pipeline</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{filteredLeads.length} leads</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>● {openCount} open</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>● {closedCount} closed</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#065f46' }}>🏆 {wonCount} won</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#991b1b' }}>❌ {lostCount} lost</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setShowNew(true)} style={{
              padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: 'none', background: TEAL, color: '#fff'
            }}>＋ New Lead</button>
            <button
              onClick={() => exportLeadsToCsv(exportRows)}
              disabled={filteredLeads.length === 0}
              title="Download the leads shown as a CSV (opens in Excel)"
              style={{
                padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: filteredLeads.length === 0 ? 'default' : 'pointer',
                border: '1px solid #d1d5db', background: '#fff',
                color: filteredLeads.length === 0 ? '#9ca3af' : '#374151'
              }}>⬇ Export CSV{filteredLeads.length ? ` (${filteredLeads.length})` : ''}</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px' }}>
          <FilterRow label="Source" value={dirFilter} onChange={setDirFilter} options={[
            { value: 'all', label: 'All' },
            { value: 'Inbound', label: '📥 Inbound' },
            { value: 'Outbound', label: '📤 Outbound' },
          ]} />
          <FilterRow label="Temp" value={tempFilter} onChange={setTempFilter} options={[
            { value: 'all', label: 'All' },
            { value: 'Cold', label: '🧊 Cold' },
            { value: 'Warm', label: '🌤️ Warm' },
            { value: 'Hot', label: '🔥 Hot' },
          ]} />
          <FilterRow label="Fit" value={fitFilter} onChange={setFitFilter} options={[
            { value: 'all', label: 'All' },
            { value: 'High', label: 'High' },
            { value: 'Medium', label: 'Medium' },
            { value: 'Low', label: 'Low' },
          ]} />
          <FilterRow label="Owner" value={assigneeFilter} onChange={setAssigneeFilter} options={[
            { value: 'all', label: 'All' },
            { value: 'unassigned', label: '○ Unassigned' },
            ...users.map(u => ({ value: u.id, label: `👤 ${u.full_name || u.email}` })),
          ]} />
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
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Add an inbound lead manually, or generate a batch of CCM prospects.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShowNew(true)} style={{ padding: '10px 24px', background: TEAL, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>＋ Add a lead</button>
              <Link href="/" style={{ padding: '10px 24px', background: '#eff6ff', color: '#1e40af', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>Generate leads →</Link>
            </div>
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
                          users={users}
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
          users={users}
          companies={companies}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onUpdate={async (id, updates) => {
            await updateLead(id, updates)
            setSelected(null)
          }}
        />
      )}

      {showNew && (
        <NewLeadModal
          onClose={() => setShowNew(false)}
          onCreate={createLead}
        />
      )}
    </div>
  )
}

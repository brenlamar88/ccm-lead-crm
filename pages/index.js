import { useState } from 'react'
import Link from 'next/link'

const TEAL = '#0d9e72'
const TEAL_LIGHT = '#e6f7f2'
const TEAL_DARK = '#076e4e'

const VP_LABELS = {
  revenue: 'additional Medicare revenue — practices bill $40–$100+ per CCM patient per month with no extra staff',
  outcomes: 'reduced hospital readmissions and measurably better chronic disease outcomes',
  efficiency: 'reduced staff workload — Anchored handles patient outreach, documentation, and billing automatically',
  compliance: 'CMS compliance and stronger quality measure performance for value-based care contracts',
}

function fitColors(score) {
  if (score === 'High') return { bg: '#d1fae5', text: '#065f46', emoji: '🟢' }
  if (score === 'Medium') return { bg: '#fef3c7', text: '#78350f', emoji: '🟡' }
  return { bg: '#fee2e2', text: '#7f1d1d', emoji: '🔴' }
}

function Badge({ label, score }) {
  const c = fitColors(score)
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
      {label}
    </span>
  )
}

function LeadCard({ lead, onSave, saving }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(lead.outreach_email || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{lead.name}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <Badge label={`${lead.fit_score} fit`} score={lead.fit_score} />
            <Badge label={`Medicare: ${lead.medicare_likelihood}`} score={lead.medicare_likelihood} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>👨‍⚕️ {lead.provider_count} providers</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>👥 {lead.patient_volume}</span>
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 4 }}>{lead.fit_rationale}</p>
          <p style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}><strong>Contact:</strong> {lead.decision_maker}</p>
          {lead.address && <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{lead.address}</p>}
          {lead.phone && <p style={{ fontSize: 11, color: '#9ca3af' }}>{lead.phone}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setOpen(!open)} style={{
          background: open ? TEAL_LIGHT : 'transparent', color: open ? TEAL_DARK : '#6b7280',
          border: `1px solid ${open ? TEAL : '#d1d5db'}`, borderRadius: 8,
          padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 500
        }}>✉️ {open ? 'Hide' : 'Show'} email</button>

        {onSave && (
          <button onClick={() => onSave(lead)} disabled={saving || lead._saved} style={{
            background: lead._saved ? '#d1fae5' : TEAL, color: lead._saved ? '#065f46' : '#fff',
            border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12,
            cursor: lead._saved ? 'default' : 'pointer', fontWeight: 600
          }}>
            {lead._saved ? '✓ Saved' : saving ? 'Saving…' : '💾 Save to CRM'}
          </button>
        )}
      </div>

      {open && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginTop: 10, fontSize: 12, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {lead.outreach_email}
          <div style={{ marginTop: 10 }}>
            <button onClick={copy} style={{
              background: copied ? TEAL : '#fff', color: copied ? '#fff' : '#374151',
              border: '1px solid #d1d5db', borderRadius: 8, padding: '5px 14px',
              fontSize: 12, cursor: 'pointer', fontWeight: 500
            }}>{copied ? '✓ Copied!' : 'Copy email'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const input = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid #d1d5db', fontSize: 14, background: '#fff', outline: 'none'
}
const label = {
  fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5,
  display: 'block', letterSpacing: '0.06em', textTransform: 'uppercase'
}

export default function Home() {
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [ptype, setPtype] = useState('primary care and family medicine')
  const [cnt, setCnt] = useState('8')
  const [vp, setVp] = useState('revenue')
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAll, setSavedAll] = useState(false)

  const generate = async () => {
    if (!city.trim() || !state.trim()) { setError('Please enter city and state.'); return }
    setError(''); setLoading(true); setDone(false); setLeads([]); setSavedAll(false)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, state, practiceType: ptype, count: cnt, valueProp: VP_LABELS[vp] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setLeads(data.leads.map(l => ({ ...l, _saved: false })))
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, state, practiceType: ptype, count: parseInt(cnt), valueProp: vp, leads }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLeads(prev => prev.map(l => ({ ...l, _saved: true })))
      setSavedAll(true)
    } catch (err) {
      setError('Save error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => { setDone(false); setLeads([]); setError(''); setFilter('all'); setSavedAll(false) }
  const filtered = filter === 'all' ? leads : leads.filter(l => l.fit_score === filter)
  const highCount = leads.filter(l => l.fit_score === 'High').length

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
          <Link href="/" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: TEAL_LIGHT, color: TEAL_DARK }}>Generate</Link>
          <Link href="/pipeline" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#6b7280' }}>Pipeline</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>

        {!done && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px 24px' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Find CCM prospects</h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Generate qualified primary care leads for Anchored Health care management outreach.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={label}>City</label><input style={input} placeholder="e.g. Lafayette" value={city} onChange={e => setCity(e.target.value)} /></div>
              <div><label style={label}>State</label><input style={input} placeholder="e.g. Louisiana" value={state} onChange={e => setState(e.target.value)} /></div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Practice type</label>
              <select style={input} value={ptype} onChange={e => setPtype(e.target.value)}>
                <option value="primary care and family medicine">Primary care & family medicine</option>
                <option value="independent primary care practices">Independent practices only</option>
                <option value="federally qualified health centers FQHCs">FQHCs</option>
                <option value="rural health clinics">Rural health clinics</option>
                <option value="internal medicine clinics">Internal medicine</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={label}>Number of leads</label>
                <select style={input} value={cnt} onChange={e => setCnt(e.target.value)}>
                  <option value="5">5 leads</option>
                  <option value="8">8 leads</option>
                  <option value="10">10 leads</option>
                </select>
              </div>
              <div>
                <label style={label}>Value prop</label>
                <select style={input} value={vp} onChange={e => setVp(e.target.value)}>
                  <option value="revenue">Revenue uplift</option>
                  <option value="outcomes">Patient outcomes</option>
                  <option value="efficiency">Staff efficiency</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
            </div>

            {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

            <button onClick={generate} disabled={loading} style={{
              width: '100%', padding: 14, background: loading ? '#9ca3af' : TEAL,
              color: '#fff', border: 'none', borderRadius: 12, fontSize: 15,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer'
            }}>
              {loading ? '⏳ Generating leads…' : '🔍 Find & Qualify Leads'}
            </button>
          </div>
        )}

        {done && (
          <div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total leads', value: leads.length, bg: TEAL_LIGHT, color: TEAL_DARK },
                { label: 'High fit', value: highCount, bg: '#d1fae5', color: '#065f46' },
                { label: 'Market', value: `${city}, ${state.slice(0,2).toUpperCase()}`, bg: '#eff6ff', color: '#1e40af' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={saveAll} disabled={saving || savedAll} style={{
                padding: '8px 16px', background: savedAll ? '#d1fae5' : TEAL,
                color: savedAll ? '#065f46' : '#fff', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: savedAll ? 'default' : 'pointer'
              }}>
                {savedAll ? '✓ All saved to CRM' : saving ? 'Saving…' : '💾 Save all to CRM'}
              </button>
              {savedAll && (
                <Link href="/pipeline" style={{
                  padding: '8px 16px', background: '#eff6ff', color: '#1e40af',
                  border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 13, fontWeight: 700
                }}>View Pipeline →</Link>
              )}
              <button onClick={reset} style={{
                padding: '8px 16px', background: '#fff', color: '#374151',
                border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}>🔄 New search</button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['all', 'High', 'Medium', 'Low'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${filter === f ? TEAL : '#d1d5db'}`,
                  background: filter === f ? TEAL_LIGHT : '#fff',
                  color: filter === f ? TEAL_DARK : '#6b7280'
                }}>{f === 'all' ? 'All leads' : `${f} fit`}</button>
              ))}
            </div>

            {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

            {filtered.map((lead, i) => <LeadCard key={i} lead={lead} />)}
          </div>
        )}
      </div>
    </div>
  )
}

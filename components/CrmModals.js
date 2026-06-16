import { useState } from 'react'
import { authedFetch } from '../lib/authedFetch'

export const TEAL = '#0d9e72'
export const TEAL_LIGHT = '#e6f7f2'
export const TEAL_DARK = '#076e4e'

export const fieldLabel = { fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }
export const fieldInput = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }

export function contactName(c) {
  if (!c) return ''
  const n = `${c.first_name || ''} ${c.last_name || ''}`.trim()
  return n || c.title || c.email || 'Unnamed contact'
}

function Overlay({ children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {children}
    </div>
  )
}

function ModalHead({ title, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h2>
      <button type="button" onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
    </div>
  )
}

function Field({ label, children }) {
  return <div><label style={fieldLabel}>{label}</label>{children}</div>
}

const EMPTY_COMPANY = {
  name: '', type: '', website: '', phone: '', email: '',
  address: '', city: '', state: '', zip: '', npi: '',
  provider_count: '', patient_volume: '', medicare_likelihood: 'Medium',
  fit_score: 'Medium', notes: '', assigned_to: '',
}

export function CompanyModal({ company, users, isAdmin, onClose, onSaved }) {
  const editing = !!company?.id
  const [form, setForm] = useState({ ...EMPTY_COMPANY, ...(company || {}), assigned_to: company?.assigned_to || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Company name is required'); return }
    setError(''); setSaving(true)
    const payload = {
      name: form.name, type: form.type || null, website: form.website || null,
      phone: form.phone || null, email: form.email || null, address: form.address || null,
      city: form.city || null, state: form.state || null, zip: form.zip || null, npi: form.npi || null,
      provider_count: form.provider_count ? parseInt(form.provider_count) : null,
      patient_volume: form.patient_volume || null, medicare_likelihood: form.medicare_likelihood || null,
      fit_score: form.fit_score || null, notes: form.notes || null,
    }
    if (isAdmin) payload.assigned_to = form.assigned_to || null
    try {
      const res = await authedFetch('/api/companies', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: company.id, ...payload } : payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved(data.company)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 620, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <ModalHead title={editing ? 'Edit company' : 'Add company'} onClose={onClose} />

        <div style={{ marginBottom: 12 }}>
          <Field label="Company name *">
            <input style={fieldInput} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Bayou Family Medicine" autoFocus />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Field label="Type"><input style={fieldInput} value={form.type || ''} onChange={e => set('type', e.target.value)} placeholder="Primary care, FQHC…" /></Field>
          <Field label="NPI"><input style={fieldInput} value={form.npi || ''} onChange={e => set('npi', e.target.value)} placeholder="10-digit NPI" /></Field>
          <Field label="Phone"><input style={fieldInput} value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(555) 123-4567" /></Field>
          <Field label="Email"><input style={fieldInput} value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="info@practice.com" /></Field>
          <Field label="Website"><input style={fieldInput} value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="practice.com" /></Field>
          <Field label="Providers"><input type="number" min="0" style={fieldInput} value={form.provider_count || ''} onChange={e => set('provider_count', e.target.value)} placeholder="#" /></Field>
        </div>

        <div style={{ marginBottom: 12 }}>
          <Field label="Address"><input style={fieldInput} value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Street address" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Field label="City"><input style={fieldInput} value={form.city || ''} onChange={e => set('city', e.target.value)} /></Field>
          <Field label="State"><input style={fieldInput} value={form.state || ''} onChange={e => set('state', e.target.value)} /></Field>
          <Field label="ZIP"><input style={fieldInput} value={form.zip || ''} onChange={e => set('zip', e.target.value)} /></Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Field label="Patient volume">
            <select style={fieldInput} value={form.patient_volume || ''} onChange={e => set('patient_volume', e.target.value)}>
              <option value="">—</option>
              <option>Small (&lt;500 pts)</option>
              <option>Medium (500-2000 pts)</option>
              <option>Large (2000+ pts)</option>
            </select>
          </Field>
          <Field label="Medicare">
            <select style={fieldInput} value={form.medicare_likelihood || ''} onChange={e => set('medicare_likelihood', e.target.value)}>
              {['High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Fit score">
            <select style={fieldInput} value={form.fit_score || ''} onChange={e => set('fit_score', e.target.value)}>
              {['High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {isAdmin && (
          <div style={{ marginBottom: 12 }}>
            <Field label="Owner">
              <select style={fieldInput} value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">— Unassigned —</option>
                {(users || []).map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </Field>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <Field label="Notes">
            <textarea rows={2} style={{ ...fieldInput, fontSize: 13, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, padding: 12, background: TEAL, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add company'}</button>
          <button type="button" onClick={onClose} style={{ padding: '12px 16px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontSize: 14, color: '#374151', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
        </div>
      </form>
    </Overlay>
  )
}

const EMPTY_CONTACT = {
  first_name: '', last_name: '', title: '', email: '', phone: '', mobile: '',
  company_id: '', is_primary: false, notes: '', assigned_to: '',
}

export function ContactModal({ contact, companies, defaultCompanyId, users, isAdmin, onClose, onSaved }) {
  const editing = !!contact?.id
  const [form, setForm] = useState({
    ...EMPTY_CONTACT,
    ...(contact || {}),
    company_id: contact?.company_id || defaultCompanyId || '',
    assigned_to: contact?.assigned_to || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() && !form.last_name.trim() && !form.email.trim()) {
      setError('Enter a name or email'); return
    }
    setError(''); setSaving(true)
    const payload = {
      first_name: form.first_name || null, last_name: form.last_name || null,
      title: form.title || null, email: form.email || null,
      phone: form.phone || null, mobile: form.mobile || null,
      company_id: form.company_id || null, is_primary: !!form.is_primary, notes: form.notes || null,
    }
    if (isAdmin) payload.assigned_to = form.assigned_to || null
    try {
      const res = await authedFetch('/api/contacts', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: contact.id, ...payload } : payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved(data.contact)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <ModalHead title={editing ? 'Edit contact' : 'Add contact'} onClose={onClose} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Field label="First name"><input style={fieldInput} value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} autoFocus /></Field>
          <Field label="Last name"><input style={fieldInput} value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} /></Field>
          <Field label="Title"><input style={fieldInput} value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="Office Manager, MD…" /></Field>
          <Field label="Email"><input style={fieldInput} value={form.email || ''} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Phone"><input style={fieldInput} value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Mobile"><input style={fieldInput} value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} /></Field>
        </div>

        {companies && (
          <div style={{ marginBottom: 12 }}>
            <Field label="Company">
              <select style={fieldInput} value={form.company_id || ''} onChange={e => set('company_id', e.target.value)}>
                <option value="">— No company —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.is_primary} onChange={e => set('is_primary', e.target.checked)} />
          Primary contact for this company
        </label>

        {isAdmin && (
          <div style={{ marginBottom: 12 }}>
            <Field label="Owner">
              <select style={fieldInput} value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">— Unassigned —</option>
                {(users || []).map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </Field>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <Field label="Notes">
            <textarea rows={2} style={{ ...fieldInput, fontSize: 13, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, padding: 12, background: TEAL, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add contact'}</button>
          <button type="button" onClick={onClose} style={{ padding: '12px 16px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontSize: 14, color: '#374151', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
        </div>
      </form>
    </Overlay>
  )
}

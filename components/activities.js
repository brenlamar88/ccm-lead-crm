import { useState, useEffect } from 'react'
import { authedFetch } from '../lib/authedFetch'

export const TEAL = 'var(--brand)'
export const TEAL_DARK = 'var(--brand-700)'

// The contact types an SDR can log.
export const ACTIVITY_TYPES = [
  { key: 'Call', emoji: '📞', bg: '#eff6ff', text: '#1e40af' },
  { key: 'Email', emoji: '✉️', bg: '#ecfeff', text: '#155e75' },
  { key: 'Text', emoji: '💬', bg: '#f0fdf4', text: '#166534' },
  { key: 'Voicemail', emoji: '📩', bg: '#fef9c3', text: '#854d0e' },
  { key: 'Meeting', emoji: '🤝', bg: '#f5f3ff', text: '#5b21b6' },
  { key: 'LinkedIn', emoji: '🔗', bg: '#eff6ff', text: '#075985' },
  { key: 'Other', emoji: '•', bg: '#f1f5f9', text: '#475569' },
]

export function typeStyle(type) {
  return ACTIVITY_TYPES.find(t => t.key === type) || ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1]
}

const fieldLabel = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }
const fieldInput = { width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid var(--line-strong)', fontSize: 13, boxSizing: 'border-box' }

// Convert a Date to the value a <input type="datetime-local"> expects (local time).
function toLocalInput(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function repName(users, id) {
  if (!id) return ''
  const u = (users || []).find(x => x.id === id)
  return u ? (u.full_name || u.email) : ''
}

// Add/edit an activity. When fixedLeadId is set the lead picker is hidden.
export function ActivityForm({ activity, leads, fixedLeadId, onSaved, onCancel }) {
  const editing = !!activity?.id
  const [type, setType] = useState(activity?.type || 'Call')
  const [leadId, setLeadId] = useState(activity?.lead_id || fixedLeadId || '')
  const [occurredAt, setOccurredAt] = useState(
    activity?.occurred_at ? toLocalInput(new Date(activity.occurred_at)) : toLocalInput(new Date())
  )
  const [notes, setNotes] = useState(activity?.notes || '')
  const [nextAction, setNextAction] = useState(activity?.next_action || '')
  const [followup, setFollowup] = useState(activity?.followup_date || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!leadId) { setError('Pick a lead'); return }
    setError(''); setSaving(true)
    const payload = {
      lead_id: leadId,
      type,
      notes: notes || null,
      next_action: nextAction || null,
      followup_date: followup || null,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
    }
    try {
      const res = await authedFetch('/api/activities', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: activity.id, ...payload } : payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved(data.activity)
      if (!editing) { setNotes(''); setNextAction(''); setFollowup(''); setType('Call'); setOccurredAt(toLocalInput(new Date())) }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: fixedLeadId ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        {!fixedLeadId && (
          <div>
            <label style={fieldLabel}>Lead</label>
            <select style={fieldInput} value={leadId} onChange={e => setLeadId(e.target.value)}>
              <option value="">— Pick a lead —</option>
              {(leads || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={fieldLabel}>Type</label>
          <select style={fieldInput} value={type} onChange={e => setType(e.target.value)}>
            {ACTIVITY_TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.key}</option>)}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>When</label>
          <input type="datetime-local" style={fieldInput} value={occurredAt} onChange={e => setOccurredAt(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={fieldLabel}>Notes</label>
        <textarea rows={2} style={{ ...fieldInput, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was discussed…" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={fieldLabel}>Next action</label>
          <input style={fieldInput} value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="e.g. Send pricing, call back" />
        </div>
        <div>
          <label style={fieldLabel}>Follow-up date</label>
          <input type="date" style={fieldInput} value={followup || ''} onChange={e => setFollowup(e.target.value)} />
        </div>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: TEAL, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Saving…' : editing ? 'Save' : '＋ Log contact'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} style={{ padding: '8px 14px', background: 'var(--surface-2)', border: 'none', borderRadius: 9, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>}
      </div>
    </form>
  )
}

// Render a list of activities (optionally showing which lead each is on).
export function ActivityList({ activities, users, showLead, onEdit, onDelete, emptyText }) {
  if (!activities || activities.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--faint)', padding: '8px 0' }}>{emptyText || 'No activity logged yet.'}</p>
  }
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {activities.map(a => {
        const ts = typeStyle(a.type)
        const overdue = a.followup_date && !a.followup_done && a.followup_date < today
        return (
          <div key={a.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ts.bg, color: ts.text }}>{ts.emoji} {a.type}</span>
              {showLead && a.leads?.name && <span style={{ fontSize: 12, fontWeight: 600 }}>{a.leads.name}</span>}
              <span style={{ fontSize: 11, color: 'var(--faint)' }}>
                {a.occurred_at ? new Date(a.occurred_at).toLocaleString() : ''}
              </span>
              {repName(users, a.rep_id) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {repName(users, a.rep_id)}</span>}
              <span style={{ flex: 1 }} />
              {onEdit && <button onClick={() => onEdit(a)} style={miniBtn('#eff6ff', '#1e40af')}>Edit</button>}
              {onDelete && <button onClick={() => onDelete(a)} style={miniBtn('#fee2e2', '#991b1b')}>Delete</button>}
            </div>
            {a.notes && <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{a.notes}</p>}
            {(a.next_action || a.followup_date) && (
              <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                {a.next_action && <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>➡️ {a.next_action}</span>}
                {a.followup_date && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: overdue ? '#991b1b' : '#065f46' }}>
                    📅 Follow up {a.followup_date}{overdue ? ' (overdue)' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function miniBtn(bg, color) {
  return { fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 7, border: '1px solid var(--line)', background: bg, color, cursor: 'pointer' }
}

// Per-lead activity log: fetches the lead's activities and shows list + add form.
export function LeadActivity({ leadId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await authedFetch(`/api/activities?lead_id=${leadId}`)
      const data = await res.json()
      if (res.ok) setActivities(data.activities || [])
    } catch (_) {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [leadId])

  const onSaved = (a) => setActivities(prev => [a, ...prev])
  const onDelete = async (a) => {
    if (!window.confirm('Delete this activity?')) return
    const res = await authedFetch('/api/activities', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id }) })
    if (res.ok) setActivities(prev => prev.filter(x => x.id !== a.id))
  }

  return (
    <div>
      <ActivityForm fixedLeadId={leadId} onSaved={onSaved} />
      <div style={{ marginTop: 12 }}>
        {loading ? <p style={{ fontSize: 12, color: 'var(--faint)' }}>Loading…</p> : <ActivityList activities={activities} onDelete={onDelete} />}
      </div>
    </div>
  )
}

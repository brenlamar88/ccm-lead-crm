import { supabase } from '../../lib/supabase'
import { getCaller } from '../../lib/auth'

const ACTIVITY_FIELDS = [
  'lead_id', 'company_id', 'contact_id', 'rep_id',
  'type', 'notes', 'next_action', 'followup_date', 'followup_done', 'occurred_at',
]

const VALID_TYPES = ['Call', 'Email', 'Text', 'Voicemail', 'Meeting', 'LinkedIn', 'Other']

function pick(obj) {
  const out = {}
  for (const k of ACTIVITY_FIELDS) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}

const SELECT = '*, leads(id, name, status), companies(id, name), contacts(id, first_name, last_name, title), rep:profiles(id, full_name, email)'

// True until the activities migration has been run. Lets the app deploy and
// degrade gracefully (empty state) instead of erroring before the table exists.
function isMissingTable(error) {
  if (!error) return false
  const c = error.code || ''
  return c === '42P01' || c === 'PGRST205' || /does not exist|schema cache/i.test(error.message || '')
}

export default async function handler(req, res) {
  const caller = await getCaller(req)
  if (caller.error) return res.status(caller.status).json({ error: caller.error })

  if (req.method === 'GET') {
    let query = supabase.from('activities').select(SELECT).order('occurred_at', { ascending: false })
    if (req.query.lead_id) query = query.eq('lead_id', req.query.lead_id)
    if (req.query.rep_id) query = query.eq('rep_id', req.query.rep_id)
    if (req.query.type) query = query.eq('type', req.query.type)
    if (req.query.from) query = query.gte('occurred_at', req.query.from)
    if (req.query.to) query = query.lte('occurred_at', req.query.to)
    if (req.query.due) {
      query = query.eq('followup_done', false).not('followup_date', 'is', null).lte('followup_date', req.query.due)
    }
    const { data, error } = await query
    if (error) {
      if (isMissingTable(error)) return res.status(200).json({ activities: [], migrationPending: true })
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ activities: data })
  }

  if (req.method === 'POST') {
    const activity = pick(req.body)
    if (!activity.lead_id) return res.status(400).json({ error: 'A lead is required' })
    if (activity.type && !VALID_TYPES.includes(activity.type)) return res.status(400).json({ error: 'Invalid contact type' })
    // Default the rep to whoever is logging.
    if (!activity.rep_id) activity.rep_id = caller.user.id

    // Auto-fill company/contact from the lead when not supplied.
    if (!activity.company_id || !activity.contact_id) {
      const { data: lead } = await supabase.from('leads').select('company_id, contact_id').eq('id', activity.lead_id).single()
      if (lead) {
        if (!activity.company_id) activity.company_id = lead.company_id
        if (!activity.contact_id) activity.contact_id = lead.contact_id
      }
    }

    const { data, error } = await supabase.from('activities').insert(activity).select(SELECT).single()
    if (error) {
      if (isMissingTable(error)) return res.status(503).json({ error: 'Activity tracking is not enabled yet — run the activities migration.' })
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ activity: data })
  }

  if (req.method === 'PATCH') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Activity id is required' })
    const updates = pick(req.body)
    if (updates.type && !VALID_TYPES.includes(updates.type)) return res.status(400).json({ error: 'Invalid contact type' })
    // Author or admin may edit.
    const { data: existing } = await supabase.from('activities').select('rep_id').eq('id', id).single()
    if (existing && existing.rep_id !== caller.user.id && caller.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own activities' })
    }
    const { data, error } = await supabase.from('activities').update(updates).eq('id', id).select(SELECT).single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ activity: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Activity id is required' })
    const { data: existing } = await supabase.from('activities').select('rep_id').eq('id', id).single()
    if (existing && existing.rep_id !== caller.user.id && caller.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own activities' })
    }
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

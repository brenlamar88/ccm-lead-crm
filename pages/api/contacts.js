import { supabase } from '../../lib/supabase'
import { getCaller, requireAdmin } from '../../lib/auth'

const CONTACT_FIELDS = [
  'company_id', 'first_name', 'last_name', 'title',
  'email', 'phone', 'mobile', 'is_primary', 'notes', 'assigned_to',
]

function pick(obj) {
  const out = {}
  for (const k of CONTACT_FIELDS) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}

export default async function handler(req, res) {
  const caller = await getCaller(req)
  if (caller.error) return res.status(caller.status).json({ error: caller.error })

  if (req.method === 'GET') {
    let query = supabase
      .from('contacts')
      .select('*, companies(id, name)')
      .order('created_at', { ascending: false })
    if (req.query.company_id) query = query.eq('company_id', req.query.company_id)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ contacts: data })
  }

  if (req.method === 'POST') {
    const contact = pick(req.body)
    if (!contact.first_name && !contact.last_name && !contact.email) {
      return res.status(400).json({ error: 'A name or email is required' })
    }
    if (contact.assigned_to !== undefined) {
      const admin = await requireAdmin(req)
      if (admin.error) return res.status(admin.status).json({ error: admin.error })
    }
    const { data, error } = await supabase.from('contacts').insert(contact).select('*, companies(id, name)').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ contact: data })
  }

  if (req.method === 'PATCH') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Contact id is required' })
    const updates = pick(req.body)
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' })
    if ('assigned_to' in updates) {
      const admin = await requireAdmin(req)
      if (admin.error) return res.status(admin.status).json({ error: admin.error })
    }
    const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select('*, companies(id, name)').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ contact: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Contact id is required' })
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

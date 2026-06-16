import { supabase } from '../../lib/supabase'
import { getCaller, requireAdmin } from '../../lib/auth'

const COMPANY_FIELDS = [
  'name', 'type', 'website', 'phone', 'email',
  'address', 'city', 'state', 'zip', 'npi',
  'provider_count', 'patient_volume', 'medicare_likelihood',
  'fit_score', 'fit_rationale', 'notes', 'assigned_to',
]

function pick(obj) {
  const out = {}
  for (const k of COMPANY_FIELDS) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}

export default async function handler(req, res) {
  const caller = await getCaller(req)
  if (caller.error) return res.status(caller.status).json({ error: caller.error })

  if (req.method === 'GET') {
    // Each company with its contacts and linked pipeline deals.
    const { data, error } = await supabase
      .from('companies')
      .select('*, contacts(*), leads(id, name, status, direction, temperature, fit_score, assigned_to)')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ companies: data })
  }

  if (req.method === 'POST') {
    const company = pick(req.body)
    if (!company.name) return res.status(400).json({ error: 'Company name is required' })
    if (company.assigned_to !== undefined) {
      const admin = await requireAdmin(req)
      if (admin.error) return res.status(admin.status).json({ error: admin.error })
    }
    const { data, error } = await supabase.from('companies').insert(company).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ company: data })
  }

  if (req.method === 'PATCH') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Company id is required' })
    const updates = pick(req.body)
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' })
    if ('assigned_to' in updates) {
      const admin = await requireAdmin(req)
      if (admin.error) return res.status(admin.status).json({ error: admin.error })
    }
    const { data, error } = await supabase.from('companies').update(updates).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ company: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Company id is required' })
    // Contacts cascade-delete; linked leads keep their data (company_id set null).
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

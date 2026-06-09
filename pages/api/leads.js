import { supabase } from '../../lib/supabase'
import { requireAdmin } from '../../lib/auth'

// Fields a lead row can carry that are safe to write from the client.
const LEAD_FIELDS = [
  'name', 'address', 'phone', 'email', 'website', 'npi',
  'provider_count', 'patient_volume', 'medicare_likelihood',
  'fit_score', 'fit_rationale', 'decision_maker', 'outreach_email',
  'status', 'notes', 'direction', 'temperature', 'assigned_to',
]

// Keep only known columns from an arbitrary object.
function pick(obj) {
  const out = {}
  for (const k of LEAD_FIELDS) {
    if (obj[k] !== undefined) out[k] = obj[k]
  }
  return out
}

export default async function handler(req, res) {

  if (req.method === 'POST') {
    // Manual single-lead entry (inbound or outbound) — no generation run attached.
    if (req.body.manual) {
      const lead = pick(req.body.lead || {})
      if (!lead.name) return res.status(400).json({ error: 'Lead name is required' })
      // Assigning a lead to a user is an admin-only action.
      if (lead.assigned_to) {
        const admin = await requireAdmin(req)
        if (admin.error) return res.status(admin.status).json({ error: admin.error })
      }
      lead.direction = lead.direction || 'Inbound'
      lead.temperature = lead.temperature || 'Warm'
      lead.status = lead.status || 'New'

      const { data, error } = await supabase.from('leads').insert(lead).select().single()
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ lead: data })
    }

    // Batch save from a generation run — these are outbound prospects.
    const { city, state, practiceType, count, valueProp, leads } = req.body

    const { data: run, error: runErr } = await supabase
      .from('lead_runs')
      .insert({ city, state, practice_type: practiceType, lead_count: count, value_prop: valueProp })
      .select()
      .single()

    if (runErr) return res.status(500).json({ error: runErr.message })

    const leadsToInsert = leads.map(l => ({
      run_id: run.id,
      name: l.name,
      address: l.address,
      phone: l.phone,
      email: l.email || null,
      website: l.website,
      npi: l.npi || null,
      provider_count: l.provider_count,
      patient_volume: l.patient_volume,
      medicare_likelihood: l.medicare_likelihood,
      fit_score: l.fit_score,
      fit_rationale: l.fit_rationale,
      decision_maker: l.decision_maker,
      outreach_email: l.outreach_email,
      status: 'New',
      direction: 'Outbound',
      temperature: l.temperature || 'Cold',
    }))

    const { data: savedLeads, error: leadsErr } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select()

    if (leadsErr) return res.status(500).json({ error: leadsErr.message })

    return res.status(200).json({ run, leads: savedLeads })
  }

  // Get all leads (for pipeline)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('leads')
      .select('*, lead_runs(city, state, created_at)')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ leads: data })
  }

  // Update any editable lead fields (status, notes, direction, temperature, contact info…)
  if (req.method === 'PATCH') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Lead id is required' })
    const updates = pick(req.body)
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' })
    // Reassigning a lead is an admin-only action.
    if ('assigned_to' in updates) {
      const admin = await requireAdmin(req)
      if (admin.error) return res.status(admin.status).json({ error: admin.error })
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ lead: data })
  }

  // Delete a lead
  if (req.method === 'DELETE') {
    const { id } = req.body
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

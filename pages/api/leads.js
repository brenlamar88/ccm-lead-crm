import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {

  // Save a batch of leads from a run
  if (req.method === 'POST') {
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
      website: l.website,
      provider_count: l.provider_count,
      patient_volume: l.patient_volume,
      medicare_likelihood: l.medicare_likelihood,
      fit_score: l.fit_score,
      fit_rationale: l.fit_rationale,
      decision_maker: l.decision_maker,
      outreach_email: l.outreach_email,
      status: 'New',
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

  // Update lead status or notes
  if (req.method === 'PATCH') {
    const { id, status, notes } = req.body
    const updates = {}
    if (status !== undefined) updates.status = status
    if (notes !== undefined) updates.notes = notes

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

import { supabase } from '../../lib/supabase'
import { supabaseAdmin, ensureServiceRole } from '../../lib/supabaseAdmin'
import { getCaller, requireAdmin } from '../../lib/auth'

async function adminCount() {
  const { count } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
  return count || 0
}

export default async function handler(req, res) {
  // Listing users is available to any authenticated user (needed for assignee
  // names); the caller's own profile is returned as `me` so the UI knows its role.
  if (req.method === 'GET') {
    const caller = await getCaller(req)
    if (caller.error) return res.status(caller.status).json({ error: caller.error })

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ users: data, me: caller.profile, userMgmtEnabled: !!supabaseAdmin })
  }

  // Everything below mutates users/roles and is admin-only + needs service role.
  const admin = await requireAdmin(req)
  if (admin.error) return res.status(admin.status).json({ error: admin.error })
  if (!ensureServiceRole(res)) return

  if (req.method === 'POST') {
    const { email, password, full_name, role } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || null },
    })
    if (error) return res.status(400).json({ error: error.message })

    // The trigger creates a member profile; set name/role explicitly.
    await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: full_name || null,
      role: role === 'admin' ? 'admin' : 'member',
    })

    return res.status(200).json({ user: { id: data.user.id, email, full_name: full_name || null, role: role === 'admin' ? 'admin' : 'member' } })
  }

  if (req.method === 'PATCH') {
    const { id, role, password, full_name } = req.body
    if (!id) return res.status(400).json({ error: 'User id is required' })

    const { data: target } = await supabaseAdmin.from('profiles').select('role').eq('id', id).single()
    if (!target) return res.status(404).json({ error: 'User not found' })

    if (role && role !== target.role) {
      // Don't allow demoting the last remaining admin.
      if (target.role === 'admin' && role === 'member' && (await adminCount()) <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin' })
      }
      const { error } = await supabaseAdmin.from('profiles')
        .update({ role: role === 'admin' ? 'admin' : 'member' }).eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
    }

    if (full_name !== undefined) {
      await supabaseAdmin.from('profiles').update({ full_name }).eq('id', id)
    }

    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password })
      if (error) return res.status(400).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'User id is required' })
    if (id === admin.user.id) return res.status(400).json({ error: 'You cannot delete your own account' })

    const { data: target } = await supabaseAdmin.from('profiles').select('role').eq('id', id).single()
    if (target?.role === 'admin' && (await adminCount()) <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin' })
    }

    // Deleting the auth user cascades to the profile row.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

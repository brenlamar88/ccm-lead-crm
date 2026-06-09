import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Identify the caller of an API route from their Bearer access token, and look
// up their profile (role). Uses the anon key scoped to the user's token — no
// service-role key required just to read who's calling.
export async function getCaller(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { error: 'Not authenticated', status: 401 }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return { error: 'Invalid or expired session', status: 401 }

  const { data: profile } = await client
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single()

  return { user, profile, client }
}

// Like getCaller, but rejects non-admins.
export async function requireAdmin(req) {
  const result = await getCaller(req)
  if (result.error) return result
  if (result.profile?.role !== 'admin') {
    return { error: 'Admin access required', status: 403 }
  }
  return result
}

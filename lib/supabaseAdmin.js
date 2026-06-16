import { createClient } from '@supabase/supabase-js'

// Server-only Supabase client using the service-role key. Bypasses RLS and can
// call the Auth Admin API (create/delete users, set passwords). NEVER import
// this into client-side code. The key is read from an env var that must be set
// in Vercel (and .env.local for local dev): SUPABASE_SERVICE_ROLE_KEY.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null

// Helper for API routes: bail out with a clear error if the key is missing.
export function ensureServiceRole(res) {
  if (!supabaseAdmin) {
    res.status(500).json({
      error: 'User management is not configured: missing SUPABASE_SERVICE_ROLE_KEY environment variable. Add it in your Vercel project settings.',
    })
    return false
  }
  return true
}

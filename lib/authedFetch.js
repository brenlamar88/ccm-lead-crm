import { supabase } from './supabase'

// fetch() wrapper that attaches the current user's Supabase access token so API
// routes can identify the caller and enforce roles.
export async function authedFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { ...(options.headers || {}) }
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
  return fetch(url, { ...options, headers })
}

import Link from 'next/link'
import { supabase } from '../lib/supabase'

const TEAL = '#0d9e72'
const TEAL_LIGHT = '#e6f7f2'
const TEAL_DARK = '#076e4e'

const LINKS = [
  { key: 'dashboard', href: '/dashboard', label: 'Dashboard' },
  { key: 'pipeline', href: '/pipeline', label: 'Pipeline' },
  { key: 'companies', href: '/companies', label: 'Companies' },
  { key: 'contacts', href: '/contacts', label: 'Contacts' },
  { key: 'activities', href: '/activities', label: 'Activity' },
  { key: 'reports', href: '/reports', label: 'Reports' },
  { key: 'generate', href: '/', label: 'Generate' },
]

export default function Nav({ active, isAdmin }) {
  return (
    <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: TEAL, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏥</div>
        <span style={{ fontWeight: 700, fontSize: 15 }}>CCM Lead CRM</span>
        <span style={{ fontSize: 11, color: '#6b7280', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>Anchored Health</span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {LINKS.map(l => {
          const on = l.key === active
          return (
            <Link key={l.key} href={l.href} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 13,
              fontWeight: on ? 600 : 500,
              background: on ? TEAL_LIGHT : 'transparent',
              color: on ? TEAL_DARK : '#6b7280',
            }}>{l.label}</Link>
          )
        })}
        {isAdmin && (
          <Link href="/users" style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 13,
            fontWeight: active === 'users' ? 600 : 500,
            background: active === 'users' ? TEAL_LIGHT : 'transparent',
            color: active === 'users' ? TEAL_DARK : '#6b7280',
          }}>Users</Link>
        )}
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#6b7280', background: 'transparent', border: '1px solid #e5e7eb', cursor: 'pointer', marginLeft: 8 }}>Sign out</button>
      </div>
    </nav>
  )
}

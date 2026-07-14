import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import ThemeToggle from './ThemeToggle'

const LINKS = [
  { key: 'dashboard', href: '/dashboard', label: 'Dashboard' },
  { key: 'pipeline', href: '/pipeline', label: 'Pipeline' },
  { key: 'companies', href: '/companies', label: 'Companies' },
  { key: 'contacts', href: '/contacts', label: 'Contacts' },
  { key: 'activities', href: '/activities', label: 'Activity' },
  { key: 'reports', href: '/reports', label: 'Reports' },
  { key: 'generate', href: '/', label: 'Generate' },
]

function NavLink({ href, label, active }) {
  const [hover, setHover] = useState(false)
  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 13px', borderRadius: 999, fontSize: 13.5, whiteSpace: 'nowrap',
        fontWeight: active ? 650 : 500,
        background: active ? 'var(--brand-50)' : hover ? 'var(--surface-2)' : 'transparent',
        color: active ? 'var(--brand-700)' : hover ? 'var(--ink-2)' : 'var(--muted)',
        transition: 'background .15s ease, color .15s ease',
      }}
    >{label}</Link>
  )
}

export default function Nav({ active, isAdmin }) {
  const [signHover, setSignHover] = useState(false)
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--nav-bg)', backdropFilter: 'saturate(180%) blur(12px)',
      WebkitBackdropFilter: 'saturate(180%) blur(12px)',
      borderBottom: '1px solid var(--line)',
      padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    }}>
      <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #14c58e 0%, #0d9e72 60%, #0b8a63 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          boxShadow: '0 2px 8px rgba(13,158,114,.35), inset 0 1px 0 rgba(255,255,255,.25)',
        }}>⚕️</div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Anchored CRM</div>
          <div style={{ fontSize: 10.5, color: 'var(--faint)', fontWeight: 600, letterSpacing: '0.02em' }}>Anchored Health</div>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: 2, alignItems: 'center', overflowX: 'auto', flex: 1, justifyContent: 'flex-end' }}>
        {LINKS.map(l => <NavLink key={l.key} href={l.href} label={l.label} active={l.key === active} />)}
        {isAdmin && <NavLink href="/users" label="Users" active={active === 'users'} />}
        <span style={{ marginLeft: 6 }}><ThemeToggle /></span>
        <button
          onClick={() => supabase.auth.signOut()}
          onMouseEnter={() => setSignHover(true)}
          onMouseLeave={() => setSignHover(false)}
          style={{
            marginLeft: 8, padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
            color: signHover ? 'var(--ink)' : 'var(--muted)',
            background: signHover ? 'var(--surface-2)' : 'transparent',
            border: '1px solid var(--line-strong)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >Sign out</button>
      </div>
    </nav>
  )
}

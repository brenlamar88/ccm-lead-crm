import Link from 'next/link'
import { useState, useEffect } from 'react'
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

// Collapse the nav to a menu button below this width.
function useIsMobile(breakpoint = 900) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return mobile
}

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

function Brand() {
  return (
    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0, minWidth: 0 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #14c58e 0%, #0d9e72 60%, #0b8a63 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
        boxShadow: '0 2px 8px rgba(13,158,114,.35), inset 0 1px 0 rgba(255,255,255,.25)',
      }}>⚕️</div>
      <div style={{ lineHeight: 1.1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Anchored CRM</div>
        <div style={{ fontSize: 10.5, color: 'var(--faint)', fontWeight: 600, letterSpacing: '0.02em' }}>Anchored Health</div>
      </div>
    </Link>
  )
}

export default function Nav({ active, isAdmin }) {
  const [signHover, setSignHover] = useState(false)
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()
  const links = isAdmin ? [...LINKS, { key: 'users', href: '/users', label: 'Users' }] : LINKS

  const barBase = {
    position: 'sticky', top: 0, zIndex: 50,
    background: 'var(--nav-bg)', backdropFilter: 'saturate(180%) blur(12px)',
    WebkitBackdropFilter: 'saturate(180%) blur(12px)',
    borderBottom: '1px solid var(--line)',
    padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  }

  // Desktop: single horizontal row.
  if (!isMobile) {
    return (
      <nav style={{ ...barBase, padding: '0 20px' }}>
        <Brand />
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 0, overflowX: 'auto', justifyContent: 'flex-end', flex: 1 }}>
          {links.map(l => <NavLink key={l.key} href={l.href} label={l.label} active={l.key === active} />)}
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

  // Mobile: brand + theme toggle + menu button, with a dropdown panel.
  return (
    <nav style={{ ...barBase, position: 'sticky', flexWrap: 'wrap' }}>
      <Brand />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <ThemeToggle />
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          style={{
            width: 38, height: 38, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--line-strong)', background: open ? 'var(--surface-2)' : 'transparent',
            color: 'var(--ink)', cursor: 'pointer', fontSize: 17,
          }}
        >{open ? '✕' : '☰'}</button>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 60, left: 0, right: 0, zIndex: 49,
          background: 'var(--surface)', borderBottom: '1px solid var(--line)',
          boxShadow: 'var(--shadow-lg)', padding: 10,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {links.map(l => {
            const on = l.key === active
            return (
              <Link key={l.key} href={l.href} onClick={() => setOpen(false)} style={{
                padding: '12px 14px', borderRadius: 10, fontSize: 15,
                fontWeight: on ? 700 : 500,
                background: on ? 'var(--brand-50)' : 'transparent',
                color: on ? 'var(--brand-700)' : 'var(--ink-2)',
              }}>{l.label}</Link>
            )
          })}
          <button
            onClick={() => { setOpen(false); supabase.auth.signOut() }}
            style={{
              marginTop: 6, padding: '12px 14px', borderRadius: 10, fontSize: 15, fontWeight: 600,
              textAlign: 'left', color: 'var(--muted)', background: 'transparent',
              border: '1px solid var(--line-strong)', cursor: 'pointer',
            }}
          >Sign out</button>
        </div>
      )}
    </nav>
  )
}

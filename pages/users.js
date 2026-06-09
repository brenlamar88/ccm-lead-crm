import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { authedFetch } from '../lib/authedFetch'

const TEAL = '#0d9e72'
const TEAL_LIGHT = '#e6f7f2'
const TEAL_DARK = '#076e4e'

const ROLE_STYLES = {
  admin:  { bg: '#ede9fe', text: '#5b21b6', label: 'Admin' },
  member: { bg: '#f1f5f9', text: '#475569', label: 'Member' },
}

const fieldLabel = { fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }
const fieldInput = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }

function genPassword() {
  // Readable but strong temporary password.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let p = ''
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)]
  return p + '!'
}

const EMPTY_NEW = { email: '', full_name: '', password: '', role: 'member' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_NEW)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await authedFetch('/api/users')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(data.users || [])
      setMe(data.me || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const flash = (msg) => { setNotice(msg); setError(''); setTimeout(() => setNotice(''), 6000) }

  const addUser = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email.trim() || !form.password) { setError('Email and password are required'); return }
    setBusyId('new')
    try {
      const res = await authedFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash(`Created ${form.email}. Share the password securely: ${form.password}`)
      setForm(EMPTY_NEW)
      setShowAdd(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const patch = async (id, body, okMsg) => {
    setError(''); setBusyId(id)
    try {
      const res = await authedFetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (okMsg) flash(okMsg)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const toggleRole = (u) => patch(u.id, { role: u.role === 'admin' ? 'member' : 'admin' },
    `${u.email} is now ${u.role === 'admin' ? 'a member' : 'an admin'}.`)

  const resetPassword = (u) => {
    const pw = window.prompt(`Set a new password for ${u.email} (min 8 chars):`, genPassword())
    if (!pw) return
    if (pw.length < 8) { setError('Password must be at least 8 characters'); return }
    patch(u.id, { password: pw }, `Password reset for ${u.email}. New password: ${pw}`)
  }

  const removeUser = async (u) => {
    if (!window.confirm(`Remove ${u.email}? This permanently deletes their account.`)) return
    setError(''); setBusyId(u.id)
    try {
      const res = await authedFetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash(`Removed ${u.email}.`)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const isAdmin = me?.role === 'admin'

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: TEAL, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏥</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>CCM Lead CRM</span>
          <span style={{ fontSize: 11, color: '#6b7280', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>Anchored Health</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Link href="/" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#6b7280' }}>Generate</Link>
          <Link href="/pipeline" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#6b7280' }}>Pipeline</Link>
          <Link href="/users" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: TEAL_LIGHT, color: TEAL_DARK }}>Users</Link>
          <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#6b7280', background: 'transparent', border: '1px solid #e5e7eb', cursor: 'pointer', marginLeft: 8 }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>User Management</h1>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{users.length} {users.length === 1 ? 'user' : 'users'} · admins can assign leads and manage accounts</p>
          </div>
          {isAdmin && (
            <button onClick={() => { setShowAdd(s => !s); setError('') }} style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: 'none', background: TEAL, color: '#fff'
            }}>{showAdd ? '✕ Cancel' : '＋ Add User'}</button>
          )}
        </div>

        {notice && <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{notice}</div>}
        {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {!loading && !isAdmin && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>🔒</p>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Admins only</p>
            <p style={{ color: '#6b7280', fontSize: 13 }}>You don't have permission to manage users. Ask an admin for access.</p>
          </div>
        )}

        {isAdmin && showAdd && (
          <form onSubmit={addUser} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={fieldLabel}>Email *</label><input style={fieldInput} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@anchoredhealth.org" /></div>
              <div><label style={fieldLabel}>Full name</label><input style={fieldInput} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="First Last" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={fieldLabel}>Temp password *</label>
                <input style={fieldInput} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="min 8 characters" />
              </div>
              <div>
                <label style={fieldLabel}>Role</label>
                <select style={fieldInput} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="button" onClick={() => setForm({ ...form, password: genPassword() })} style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: '1px solid #d1d5db', background: '#fff', color: '#374151', whiteSpace: 'nowrap'
              }}>🎲 Generate</button>
            </div>
            <button type="submit" disabled={busyId === 'new'} style={{
              marginTop: 16, padding: '10px 20px', background: TEAL, color: '#fff', border: 'none',
              borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer'
            }}>{busyId === 'new' ? 'Creating…' : 'Create user'}</button>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>⏳ Loading users…</div>
        ) : isAdmin ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
            {users.map((u, i) => {
              const rs = ROLE_STYLES[u.role] || ROLE_STYLES.member
              const busy = busyId === u.id
              const isSelf = u.id === me?.id
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: i ? '1px solid #f1f5f9' : 'none', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name || u.email}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: rs.bg, color: rs.text }}>{rs.label}</span>
                      {isSelf && <span style={{ fontSize: 10, color: '#9ca3af' }}>(you)</span>}
                    </div>
                    {u.full_name && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{u.email}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button disabled={busy} onClick={() => toggleRole(u)} style={btn('#eff6ff', '#1e40af')}>
                      {u.role === 'admin' ? 'Make member' : 'Make admin'}
                    </button>
                    <button disabled={busy} onClick={() => resetPassword(u)} style={btn('#fff7ed', '#9a3412')}>Reset password</button>
                    <button disabled={busy || isSelf} onClick={() => removeUser(u)} style={btn('#fee2e2', '#991b1b', busy || isSelf)}>Remove</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function btn(bg, color, disabled) {
  return {
    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', background: bg, color,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
  }
}

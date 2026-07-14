import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hover, setHover] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  const input = {
    width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line-strong)',
    fontSize: 14.5, outline: 'none', boxSizing: 'border-box', background: '#fff', color: 'var(--ink)',
  }
  const label = {
    fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6,
    letterSpacing: '0.06em', textTransform: 'uppercase',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(1100px 600px at 15% -10%, #d9f5ec 0%, rgba(217,245,236,0) 55%), radial-gradient(900px 500px at 110% 110%, #dbeafe 0%, rgba(219,234,254,0) 50%), linear-gradient(180deg, #f7fafc 0%, #eef2f7 100%)',
    }}>
      <div style={{
        position: 'relative', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
        borderRadius: 22, border: '1px solid var(--line)', padding: '40px 36px', width: '100%', maxWidth: 400,
        boxShadow: 'var(--shadow-lg)', animation: 'fadeUp .4s ease both',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px',
            background: 'linear-gradient(135deg, #14c58e 0%, #0d9e72 60%, #0b8a63 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 27,
            boxShadow: '0 8px 20px rgba(13,158,114,.4), inset 0 1px 0 rgba(255,255,255,.3)',
          }}>⚕️</div>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 }}>Anchored Health</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 7 }}>CCM Lead CRM — sign in to continue</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={input} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={input} />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', fontSize: 13, padding: '11px 14px', borderRadius: 10, marginBottom: 16, border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
              width: '100%', color: '#fff', border: 'none', borderRadius: 12, padding: '13px',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #12b586 0%, #0d9e72 100%)',
              boxShadow: loading ? 'none' : hover ? '0 8px 20px rgba(13,158,114,.4)' : '0 4px 12px rgba(13,158,114,.3)',
              transform: hover && !loading ? 'translateY(-1px)' : 'none',
              transition: 'box-shadow .18s ease, transform .12s ease, background .18s ease',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', marginTop: 24 }}>
          Access is invite-only. Contact your admin to get an account.
        </p>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light')
  const [hover, setHover] = useState(false)

  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') || 'light')
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('theme', next) } catch (e) {}
    setTheme(next)
  }

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle color theme"
      style={{
        width: 34, height: 34, borderRadius: 999, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        border: '1px solid var(--line-strong)', cursor: 'pointer',
        background: hover ? 'var(--surface-2)' : 'transparent', color: 'var(--ink-2)',
      }}
    >{theme === 'dark' ? '☀️' : '🌙'}</button>
  )
}

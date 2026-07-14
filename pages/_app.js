import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Inter } from 'next/font/google'
import { supabase } from '../lib/supabase'
import '../styles/globals.css'

// Self-hosted at build time — no layout shift, no external request at runtime.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

const PUBLIC_ROUTES = ['/login']

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !PUBLIC_ROUTES.includes(router.pathname)) {
        router.replace('/login')
      } else {
        setChecking(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login')
      } else if (session && router.pathname === '/login') {
        router.replace('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [router.pathname])

  return (
    <div className={`${inter.variable} ${inter.className}`}>
      {checking && !PUBLIC_ROUTES.includes(router.pathname)
        ? <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
        : <Component {...pageProps} />}
    </div>
  )
}

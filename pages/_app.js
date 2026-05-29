import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import '../styles/globals.css'

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

  if (checking && !PUBLIC_ROUTES.includes(router.pathname)) {
    return <div style={{ minHeight: '100vh', background: '#f9fafb' }} />
  }

  return <Component {...pageProps} />
}

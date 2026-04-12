import { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ui } from '../../../shared/styles/dashboard-ui'
import { useAuthStore } from '../store/auth.store'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.auth.status)
  const session = useAuthStore((s) => s.auth.session)
  const initAuth = useAuthStore((s) => s.initAuth)
  const location = useLocation()
  const initOnceRef = useRef(false)

  useEffect(() => {
    if (!initOnceRef.current && status === 'idle') {
      initOnceRef.current = true
      void initAuth()
    }
  }, [initAuth, status])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className={ui.container}>
        <section className={ui.card}>
          <p className={ui.muted}>Verificando sessão…</p>
        </section>
      </div>
    )
  }

  if (!session?.user) {
    const from = location.pathname + location.search + location.hash
    return <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />
  }
  return children
}

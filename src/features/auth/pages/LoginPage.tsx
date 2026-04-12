import { useEffect, useState } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ui } from '../../../shared/styles/dashboard-ui'
import { useAuthStore } from '../store/auth.store'

export function LoginPage() {
  const authStatus = useAuthStore((s) => s.auth.status)
  const authSession = useAuthStore((s) => s.auth.session)
  const authError = useAuthStore((s) => s.auth.authError)
  const initAuth = useAuthStore((s) => s.initAuth)
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword)
  const clearAuthError = useAuthStore((s) => s.clearAuthError)

  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    void initAuth()
  }, [initAuth])

  useEffect(() => {
    if (!authSession?.user) return
    const params = new URLSearchParams(location.search)
    const from = params.get('from') || '/'
    navigate(from, { replace: true })
  }, [authSession?.user, location.search, navigate])

  async function onAuthSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (authBusy || !authEmail.trim() || !authPassword) return
    setAuthBusy(true)
    clearAuthError()
    try {
      await signInWithPassword(authEmail, authPassword)
      setAuthPassword('')
    } catch (err) {
      console.error(err)
    } finally {
      setAuthBusy(false)
    }
  }

  return (
    <div className={ui.container}>
      <header className={ui.header}>
        <div>
          <h1>My Money Control</h1>
          <p className={ui.muted}>Entre para acessar seus dados na nuvem.</p>
        </div>
        <div className={ui.pill}>
          {authStatus === 'loading' || authStatus === 'idle' ? 'Sessão…' : authSession?.user ? 'Logado' : 'Login'}
        </div>
      </header>

      <section className={ui.cardLogin} aria-label="Login">
        <h2 className={ui.cardTitle}>Login</h2>
        {authError ? (
          <p className={ui.cloudAuthError} role="alert">
            {authError}
          </p>
        ) : null}
        <form onSubmit={(e) => void onAuthSignIn(e)}>
          <div className={ui.row2}>
            <label>
              <span>E-mail</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                disabled={authBusy}
              />
            </label>
            <label>
              <span>Senha</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                disabled={authBusy}
              />
            </label>
          </div>
          <div className={ui.rowActionsLogin}>
            <button type="submit" disabled={authBusy} className={ui.btnWithIcon}>
              {authBusy ? (
                <Loader2 className={ui.btnIconSpin} aria-hidden />
              ) : (
                <LogIn className={ui.btnIcon} aria-hidden />
              )}
              <span>{authBusy ? 'Entrando…' : 'Entrar'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

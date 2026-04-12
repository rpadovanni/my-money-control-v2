import type { Session } from '@supabase/supabase-js'
import {
  CloudUpload,
  LayoutDashboard,
  Loader2,
  LogOut,
  Receipt,
  Tags,
  WalletCards,
  WifiOff,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { wasLocalDataMigratedForUser } from '../../shared/lib/data/migrate-local-to-cloud'
import { isSupabaseConfigured } from '../../shared/lib/supabase/client'
import { ui } from '../../shared/styles/dashboard-ui'

function navLinkClass(isActive: boolean) {
  return [
    'inline-flex items-center gap-2 rounded-full border border-mmc-border bg-mmc-surface px-2.5 py-2 text-[13px] text-white/82 no-underline transition-colors',
    'hover:bg-white/[0.08]',
    isActive &&
      "relative border-mmc-accent/55 shadow-[0_0_0_4px_var(--color-mmc-nav-active-glow)] after:pointer-events-none after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-sm after:bg-mmc-accent/85 after:content-['']",
  ]
    .filter(Boolean)
    .join(' ')
}

export function DashboardChrome({
  online,
  usingCloud,
  authReady,
  ready,
  authSession,
  migratingLocal,
  onMigrateLocalToCloud,
  onSignOut,
  view,
  children,
}: {
  online: boolean
  usingCloud: boolean
  authReady: boolean
  ready: boolean
  authSession: Session | null
  migratingLocal: boolean
  onMigrateLocalToCloud: () => void | Promise<void>
  onSignOut: () => void | Promise<void>
  view: 'home' | 'accounts' | 'transactions' | 'categories'
  children: React.ReactNode
}) {
  return (
    <div className={!online ? ui.containerOffline : ui.container}>
      {!online ? (
        <div className={ui.offlineBar} role="status">
          <WifiOff className={ui.btnIcon} aria-hidden />
          <span>Você está offline. O app precisa de conexão para sincronizar com a nuvem.</span>
        </div>
      ) : null}
      <header className={ui.header}>
        <div>
          <h1>My Money Control</h1>
          <p className={ui.muted}>
            {usingCloud
              ? 'Dados na nuvem (Supabase). Requer conexão para alterações.'
              : isSupabaseConfigured()
                ? 'Dados neste aparelho (IndexedDB). Entre na nuvem para sincronizar entre dispositivos.'
                : 'Dados neste aparelho (IndexedDB). Opcional: variáveis VITE_SUPABASE_* para sync.'}
          </p>
        </div>
        <div className={ui.headerAside}>
          <div className={ui.pill}>
            {!authReady ? 'Sessão…' : ready ? (usingCloud ? 'Nuvem' : 'Local') : 'Carregando…'}
          </div>
          {isSupabaseConfigured() && authSession?.user ? (
            <div className={ui.headerCloud} aria-label="Sessão na nuvem">
              <span className={ui.headerCloudEmail} title={authSession.user.email ?? undefined}>
                {authSession.user.email}
              </span>
              <div className={ui.headerCloudActions}>
                <button
                  type="button"
                  className={`${ui.btnSecondary} ${ui.btnIconBtnHeader}`}
                  disabled={
                    migratingLocal || wasLocalDataMigratedForUser(authSession.user.id) || !ready
                  }
                  onClick={() => void onMigrateLocalToCloud()}
                  aria-label={
                    wasLocalDataMigratedForUser(authSession.user.id)
                      ? 'Dados deste aparelho já foram enviados para a nuvem'
                      : migratingLocal
                        ? 'Enviando dados locais…'
                        : 'Enviar dados locais para a nuvem'
                  }
                  title={
                    wasLocalDataMigratedForUser(authSession.user.id)
                      ? 'Já enviado deste aparelho'
                      : migratingLocal
                        ? 'Enviando…'
                        : 'Enviar dados locais'
                  }
                >
                  {migratingLocal ? (
                    <Loader2 className={ui.btnIconSpin} aria-hidden />
                  ) : (
                    <CloudUpload className={ui.btnIconHeader} aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className={`${ui.btnSecondary} ${ui.btnIconBtnHeader}`}
                  onClick={() => void onSignOut()}
                  aria-label="Sair"
                  title="Sair"
                >
                  <LogOut className={ui.btnIconHeader} aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <nav className={ui.topNav} aria-label="Navegação principal">
        <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
          <LayoutDashboard className={ui.topNavIcon} aria-hidden />
          <span>Início</span>
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => navLinkClass(isActive)}>
          <Receipt className={ui.topNavIcon} aria-hidden />
          <span>Transações</span>
        </NavLink>
        <NavLink to="/accounts" className={({ isActive }) => navLinkClass(isActive)}>
          <WalletCards className={ui.topNavIcon} aria-hidden />
          <span>Contas</span>
        </NavLink>
        <NavLink to="/categories" className={({ isActive }) => navLinkClass(isActive)}>
          <Tags className={ui.topNavIcon} aria-hidden />
          <span>Categorias</span>
        </NavLink>
      </nav>

      {view !== 'home' ? (
        <h2 className={ui.pageTitle}>
          {view === 'transactions'
            ? 'Transações'
            : view === 'accounts'
              ? 'Contas'
              : 'Categorias'}
        </h2>
      ) : null}

      {children}
    </div>
  )
}

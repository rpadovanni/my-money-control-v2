import { ArrowUp, Download, Loader2, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { AccountsCard } from '../../features/accounts/components/AccountsCard'
import { useAccountsStore } from '../../features/accounts/store/accounts.store'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { CategoriesSection } from '../../features/categories/components/CategoriesSection'
import { useCategoriesStore } from '../../features/categories/store/categories.store'
import { TransactionFiltersAndSummary } from '../../features/transactions/components/TransactionFiltersAndSummary'
import { TransactionFormCard } from '../../features/transactions/components/TransactionFormCard'
import { TransactionListCard } from '../../features/transactions/components/TransactionListCard'
import { useTransactionsStore } from '../../features/transactions/store/transactions.store'
import { isSupabaseConfigured } from '../../shared/lib/supabase/client'
import { ui } from '../../shared/styles/dashboard-ui'
import { DashboardChrome } from '../components/DashboardChrome'
import { useDashboardBootstrap } from '../hooks/useDashboardBootstrap'
import { useDashboardFeedback } from '../hooks/useDashboardFeedback'
import { useDashboardShell } from '../hooks/useDashboardShell'
import { useTransactionWorkspaceState } from '../hooks/useTransactionWorkspaceState'

export function DashboardPage() {
  useDashboardBootstrap()

  const authStatus = useAuthStore((s) => s.auth.status)
  const authSession = useAuthStore((s) => s.auth.session)
  const signOut = useAuthStore((s) => s.signOut)

  const txReady = useTransactionsStore((s) => s.transactions.ready)
  const accReady = useAccountsStore((s) => s.accounts.ready)
  const catReady = useCategoriesStore((s) => s.categories.ready)
  const categoriesInitError = useCategoriesStore((s) => s.categories.initError)
  const authReady = authStatus === 'signedIn' || authStatus === 'signedOut'
  const ready = authReady && txReady && accReady && catReady
  const usingCloud =
    isSupabaseConfigured() && authStatus === 'signedIn' && Boolean(authSession?.user)

  const initCat = useCategoriesStore((s) => s.categoriesInit)
  const addTransaction = useTransactionsStore((s) => s.addTransaction)

  const location = useLocation()
  const view: 'home' | 'accounts' | 'transactions' | 'categories' =
    location.pathname === '/accounts'
      ? 'accounts'
      : location.pathname === '/transactions'
        ? 'transactions'
        : location.pathname === '/categories'
          ? 'categories'
          : 'home'

  const showTxFiltersSummary = view === 'home' || view === 'transactions'
  const showAccounts = view === 'home' || view === 'accounts'
  const showTxWorkspace = view === 'home' || view === 'transactions'

  const {
    online,
    showScrollTop,
    showPwaInstallChrome,
    onPwaInstallClick,
    dismissPwaInstall,
  } = useDashboardShell()

  const { notice, setNotice, toast, pushToast, migratingLocal, onMigrateLocalToCloud } =
    useDashboardFeedback()

  const {
    editingId,
    setEditingId,
    submittingTx,
    setSubmittingTx,
    txAccountsPicker,
    txArchivedPicker,
    txCategoriesPicker,
    filterAccounts,
    filterCategories,
  } = useTransactionWorkspaceState()

  return (
    <DashboardChrome
      online={online}
      usingCloud={usingCloud}
      authReady={authReady}
      ready={ready}
      authSession={authSession}
      migratingLocal={migratingLocal}
      onMigrateLocalToCloud={() => void onMigrateLocalToCloud()}
      onSignOut={() => void signOut()}
      view={view}
    >
      {notice ? (
        <div className={ui.noticeError} role="alert" aria-live="polite">
          <span className={ui.noticeText}>{notice.message}</span>
          <button
            type="button"
            className={ui.noticeDismiss}
            onClick={() => setNotice(null)}
            aria-label="Fechar aviso"
          >
            <X className={ui.btnIcon} aria-hidden />
          </button>
        </div>
      ) : null}

      {view === 'categories' ? <CategoriesSection pushToast={pushToast} /> : null}

      {usingCloud && categoriesInitError ? (
        <div className={ui.noticeError} role="alert" aria-live="polite">
          <span className={ui.noticeText}>{categoriesInitError}</span>
          <button
            type="button"
            className={`${ui.btnSecondary} ${ui.btnWithIcon}`}
            disabled={!catReady}
            onClick={() => void initCat()}
          >
            {!catReady ? <Loader2 className={ui.btnIconSpin} aria-hidden /> : null}
            <span>Tentar novamente</span>
          </button>
        </div>
      ) : null}

      {showTxFiltersSummary ? (
        <TransactionFiltersAndSummary accounts={filterAccounts} categories={filterCategories} />
      ) : null}

      {showAccounts ? (
        <section className={showTxWorkspace ? ui.grid : ui.gridSingle}>
          <AccountsCard
            onAddTransfer={(input) => addTransaction(input)}
            pushToast={pushToast}
            setNotice={setNotice}
          />
          {showTxWorkspace ? (
            <TransactionFormCard
              accounts={txAccountsPicker}
              archivedAccounts={txArchivedPicker}
              categories={txCategoriesPicker}
              categoriesReady={catReady}
              pushToast={pushToast}
              setNotice={setNotice}
              editingId={editingId}
              setEditingId={setEditingId}
              submittingTx={submittingTx}
              setSubmittingTx={setSubmittingTx}
            />
          ) : null}
        </section>
      ) : null}

      {!showAccounts && showTxWorkspace ? (
        <section className={ui.grid}>
          <TransactionFormCard
            accounts={txAccountsPicker}
            archivedAccounts={txArchivedPicker}
            categories={txCategoriesPicker}
            categoriesReady={catReady}
            pushToast={pushToast}
            setNotice={setNotice}
            editingId={editingId}
            setEditingId={setEditingId}
            submittingTx={submittingTx}
            setSubmittingTx={setSubmittingTx}
          />
          <TransactionListCard
            accounts={txAccountsPicker}
            archivedAccounts={txArchivedPicker}
            categories={txCategoriesPicker}
            pushToast={pushToast}
            setNotice={setNotice}
            editingId={editingId}
            setEditingId={setEditingId}
            setSubmittingTx={setSubmittingTx}
            transactionsRouteActive={view === 'transactions'}
          />
        </section>
      ) : null}

      {showAccounts && showTxWorkspace ? (
        <section className={ui.gridSingle}>
          <TransactionListCard
            accounts={txAccountsPicker}
            archivedAccounts={txArchivedPicker}
            categories={txCategoriesPicker}
            pushToast={pushToast}
            setNotice={setNotice}
            editingId={editingId}
            setEditingId={setEditingId}
            setSubmittingTx={setSubmittingTx}
            transactionsRouteActive={false}
          />
        </section>
      ) : null}

      {toast ? (
        <div className={ui.toastStack} role="status" aria-live="polite">
          <div className={toast.variant === 'success' ? ui.toastOk : ui.toastErr}>{toast.message}</div>
        </div>
      ) : null}

      {showScrollTop ? (
        <button
          type="button"
          className={ui.scrollTop}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo"
          title="Topo"
          style={showPwaInstallChrome ? { bottom: '5.75rem' } : undefined}
        >
          <ArrowUp className={ui.btnIcon} aria-hidden />
        </button>
      ) : null}

      {showPwaInstallChrome ? (
        <div className={ui.pwaBar} role="region" aria-label="Instalar aplicativo">
          <p className={ui.pwaBarText}>
            Adicione à tela inicial para abrir mais rápido, como um app.
          </p>
          <div className={ui.pwaActions}>
            <button type="button" className={`${ui.btnGhost} ${ui.btnWithIcon}`} onClick={dismissPwaInstall}>
              <X className={ui.btnIcon} aria-hidden />
              <span>Agora não</span>
            </button>
            <button type="button" className={ui.btnWithIcon} onClick={() => void onPwaInstallClick()}>
              <Download className={ui.btnIcon} aria-hidden />
              <span>Instalar</span>
            </button>
          </div>
        </div>
      ) : null}
    </DashboardChrome>
  )
}

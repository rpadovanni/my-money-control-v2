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
        <div className="alert alert-error mb-4" role="alert" aria-live="polite">
          <span>{notice.message}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => setNotice(null)}
            aria-label="Fechar aviso"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {view === 'categories' ? <CategoriesSection pushToast={pushToast} /> : null}

      {usingCloud && categoriesInitError ? (
        <div className="alert alert-error mb-4" role="alert" aria-live="polite">
          <span>{categoriesInitError}</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!catReady}
            onClick={() => void initCat()}
          >
            {!catReady ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            <span>Tentar novamente</span>
          </button>
        </div>
      ) : null}

      {showTxFiltersSummary ? (
        <TransactionFiltersAndSummary accounts={filterAccounts} categories={filterCategories} />
      ) : null}

      {showAccounts ? (
        <section className={showTxWorkspace ? 'mt-4 grid grid-cols-1 gap-4 min-[900px]:grid-cols-2' : 'mt-4'}>
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
        <section className="mt-4 grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
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
        <section className="mt-4">
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
        <div className="toast toast-center toast-bottom z-[150]" role="status" aria-live="polite">
          <div className={`alert ${toast.variant === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      ) : null}

      {showScrollTop ? (
        <button
          type="button"
          className="btn btn-circle btn-ghost fixed bottom-4 right-4 z-[130]"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo"
          title="Topo"
          style={showPwaInstallChrome ? { bottom: '5.75rem' } : undefined}
        >
          <ArrowUp className="size-4" aria-hidden />
        </button>
      ) : null}

      {showPwaInstallChrome ? (
        <div className="fixed bottom-4 left-4 right-4 z-[140] rounded-box border border-base-300 bg-base-100 p-4 shadow" role="region" aria-label="Instalar aplicativo">
          <p className="m-0 mb-3 text-base-content/80">
            Adicione à tela inicial para abrir mais rápido, como um app.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={dismissPwaInstall}>
              <X className="size-4" aria-hidden />
              <span>Agora não</span>
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void onPwaInstallClick()}>
              <Download className="size-4" aria-hidden />
              <span>Instalar</span>
            </button>
          </div>
        </div>
      ) : null}
    </DashboardChrome>
  )
}

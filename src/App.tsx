import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowUp,
  Check,
  CreditCard,
  CloudUpload,
  Download,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Receipt,
  Star,
  Tags,
  Trash2,
  Undo2,
  WalletCards,
  WifiOff,
  X,
} from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  currentMonthYYYYMM,
  formatISODateForDisplay,
  formatMonthYearForDisplay,
  todayISODate,
} from './shared/lib/dates'
import { migrateLocalDexieToCloud, wasLocalDataMigratedForUser } from './shared/lib/data/migrate-local-to-cloud'
import { summaryPeriodDelta } from './shared/lib/transaction-net'
import { isSupabaseConfigured } from './shared/lib/supabase/client'
import { useStore } from './shared/store'
import type { Account, AccountType } from './shared/store/types/accounts'
import type { TransactionType } from './shared/store/types/transactions'

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  bank: 'Banco',
  wallet: 'Carteira',
  credit_card: 'Cartão de crédito',
  other: 'Outro',
}

function formatCents(cents: number) {
  const value = cents / 100
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function signedFormatCents(cents: number) {
  const sign = cents >= 0 ? '+' : '−'
  return sign + ' ' + formatCents(Math.abs(cents))
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.'
}

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

const ui = {
  container: 'mx-auto max-w-[1100px] px-mmc-3 pb-12 pt-mmc-4',
  containerOffline:
    'mx-auto max-w-[1100px] px-mmc-3 pb-12 pt-[calc(var(--spacing-mmc-4)+36px)]',
  header: 'mb-4 flex items-start justify-between gap-4',
  headerAside:
    'flex max-w-full shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 self-center sm:max-w-[520px]',
  headerCloud: 'flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5',
  headerCloudEmail:
    'max-w-[160px] truncate text-mmc-sm leading-tight sm:max-w-[55vw] min-[900px]:max-w-[280px]',
  headerCloudActions: 'flex shrink-0 flex-nowrap gap-1',
  muted: 'text-mmc-muted',
  card: 'rounded-mmc-card border border-mmc-border-subtle bg-mmc-surface p-mmc-3',
  cardTitle: 'mb-mmc-2 text-mmc-md font-semibold',
  cardLogin: 'mb-4 rounded-mmc-card border border-mmc-border-subtle bg-mmc-surface p-mmc-3',
  codeBlock:
    'mt-2.5 overflow-auto whitespace-pre rounded-mmc-card border border-mmc-border bg-mmc-code-bg p-3 text-mmc-sm leading-snug',
  cloudAuthError:
    'mb-3 rounded-mmc-input border border-mmc-notice-err-border bg-mmc-notice-err-bg p-2.5 text-mmc-base text-mmc-notice-err-text',
  pill: 'rounded-full border border-white/16 bg-white/[0.06] px-2.5 py-1.5 text-mmc-sm',
  row: 'grid grid-cols-1 gap-3 min-[640px]:grid-cols-3',
  row2: 'grid grid-cols-1 gap-3 min-[640px]:grid-cols-2',
  row4: 'grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[960px]:grid-cols-4',
  rowActionsLogin: 'mt-3 flex flex-wrap items-center gap-2.5',
  form: 'grid grid-cols-1 gap-3 min-[640px]:grid-cols-2',
  formFull: 'col-span-full min-[640px]:col-span-2',
  actions: 'col-span-full flex justify-end gap-2 min-[640px]:col-span-2',
  btnWithIcon: 'inline-flex items-center gap-2',
  btnIcon: 'size-[18px] shrink-0 opacity-90',
  btnIconSpin: 'size-[18px] shrink-0 animate-spin opacity-90',
  btnIconHeader: 'size-4 shrink-0 opacity-90',
  btnGhost: 'bg-transparent',
  btnDanger: 'border-mmc-danger-border text-mmc-danger-fg',
  btnSecondary: 'bg-white/[0.04]',
  btnIconBtn:
    'inline-flex min-h-10 min-w-10 items-center justify-center p-2 leading-none',
  btnIconBtnHeader:
    'inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 leading-none',
  btnIconAside:
    'inline-flex min-h-10 min-w-10 items-center justify-center border-mmc-border bg-mmc-surface-2 p-2 leading-none',
  btnIconAsideGhost:
    'inline-flex min-h-10 min-w-10 items-center justify-center border-mmc-border bg-white/[0.05] p-2 leading-none',
  btnIconAsideDanger:
    'inline-flex min-h-10 min-w-10 items-center justify-center border-mmc-danger-icon-border bg-mmc-danger-icon-bg p-2 leading-none text-red-200',
  topNavIcon: 'size-[18px] shrink-0',
  grid: 'mt-mmc-3 grid grid-cols-1 gap-mmc-3 min-[900px]:grid-cols-2',
  gridSingle: 'mt-mmc-3 grid grid-cols-1 gap-mmc-3',
  pageTitle: 'mb-mmc-2 text-mmc-lg font-bold tracking-tight text-white/95',
  noticeError:
    'mb-4 flex items-start gap-2.5 rounded-mmc-panel border border-mmc-notice-err-border bg-mmc-notice-err-bg px-3.5 py-3 text-mmc-base leading-snug text-mmc-notice-err-text',
  noticeText: 'min-w-0 flex-1',
  noticeDismiss:
    'inline-flex min-h-8 min-w-8 shrink-0 bg-black/15 px-2.5 py-1 text-lg leading-tight',
  hint: 'text-mmc-xs leading-snug text-mmc-hint',
  hintBlock: 'mb-3 mt-0 text-mmc-xs leading-snug text-mmc-hint',
  stickyFilters:
    'sticky top-mmc-2 z-[3] self-start rounded-mmc-card border border-mmc-border-subtle bg-mmc-surface p-mmc-3 shadow-[0_4px_24px_rgb(0_0_0_/_0.35)]',
  periodLabel: 'mb-3 mt-0 text-[13px] text-mmc-muted',
  summaryGrid: 'grid grid-cols-2 gap-3 min-[720px]:grid-cols-4',
  value: 'mt-1 font-bold',
  positive: 'text-mmc-positive',
  negative: 'text-mmc-negative',
  neutral: 'text-mmc-neutral',
  accountForm: 'mb-4',
  accountFormDisabled: 'pointer-events-none opacity-55',
  accountEditForm:
    'mb-4 grid grid-cols-1 gap-3 rounded-mmc-panel border border-mmc-pwa-border p-3 min-[640px]:grid-cols-2',
  accountEditTitle: 'col-span-full mb-2 mt-0 text-[15px] font-semibold',
  list: 'mt-2 flex list-none flex-col gap-2.5 p-0',
  item: 'flex items-start justify-between gap-3 rounded-mmc-panel border border-mmc-border-soft bg-mmc-item-bg p-3',
  itemRow: 'items-center',
  itemRowTall: 'items-start',
  itemMain: 'min-w-0 flex-1',
  itemAside: 'flex shrink-0 flex-col items-end justify-center gap-2.5',
  itemAsideTall: 'flex shrink-0 flex-col items-end justify-start gap-2.5 pt-px',
  itemAsideMeta:
    'max-w-[min(200px,52vw)] text-right text-mmc-sm leading-snug tracking-wide text-mmc-muted [overflow-wrap:break-word] [hyphens:auto]',
  itemActions: 'flex shrink-0 flex-nowrap items-center justify-end gap-1.5',
  itemHead: 'flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2',
  itemHeadMain: 'flex min-w-0 flex-wrap items-center gap-2',
  tag: 'inline-flex shrink-0 items-center rounded-full border border-mmc-tag-border bg-mmc-tag-bg px-2 py-0.5 text-mmc-xs font-semibold tracking-wide text-mmc-tag-text',
  txAmount: 'leading-snug [&_strong]:text-[1.05rem]',
  txDetail: 'mt-1.5 text-mmc-base leading-snug text-mmc-muted',
  emptyState:
    'flex flex-col items-center gap-mmc-2 px-mmc-2 py-mmc-4 text-center',
  emptyIcon: 'size-12 text-mmc-empty-icon opacity-45',
  emptyTitle: 'm-0 text-mmc-md font-semibold text-white/88',
  offlineBar:
    'fixed left-0 right-0 top-0 z-[200] flex items-center justify-center gap-mmc-2 border-b border-mmc-offline-border bg-mmc-offline-bg px-mmc-3 py-mmc-1 text-mmc-sm text-mmc-offline-text',
  toastStack:
    'pointer-events-none fixed bottom-mmc-3 left-1/2 z-[150] flex max-w-[min(420px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-mmc-1 [&>*]:pointer-events-auto',
  toastOk:
    'animate-[mmc-toast-in_0.22s_ease-out] rounded-mmc-toast border border-mmc-toast-ok-border bg-mmc-toast-ok-bg px-mmc-3 py-mmc-2 text-mmc-sm leading-snug text-mmc-toast-ok-text shadow-[0_8px_32px_rgb(0_0_0_/_0.45)]',
  toastErr:
    'animate-[mmc-toast-in_0.22s_ease-out] rounded-mmc-toast border border-mmc-toast-err-border bg-mmc-toast-err-bg px-mmc-3 py-mmc-2 text-mmc-sm leading-snug text-mmc-toast-err-text shadow-[0_8px_32px_rgb(0_0_0_/_0.45)]',
  scrollTop:
    'fixed bottom-mmc-3 right-mmc-3 z-[130] inline-flex size-11 items-center justify-center rounded-full border border-white/18 bg-mmc-scroll-bg text-white/90 shadow-[0_4px_20px_rgb(0_0_0_/_0.4)] hover:bg-mmc-scroll-hover',
  pwaBar:
    'fixed bottom-mmc-3 left-mmc-3 right-mmc-3 z-[140] flex flex-wrap items-center justify-between gap-mmc-2 rounded-mmc-panel border border-mmc-pwa-border bg-mmc-pwa-bg px-mmc-3 py-mmc-2 text-mmc-sm shadow-[0_8px_32px_rgb(0_0_0_/_0.5)]',
  pwaBarText: 'm-0 min-w-[200px] flex-1 leading-snug text-white/82',
  pwaActions: 'flex flex-wrap items-center gap-mmc-1',
  modalRoot:
    'fixed inset-0 z-[1000] flex items-center justify-center bg-mmc-modal-overlay p-4',
  modalPanel:
    'w-full max-w-[420px] rounded-mmc-card border border-mmc-modal-border bg-mmc-modal-panel p-5 shadow-[0_16px_48px_rgb(0_0_0_/_0.45)] outline-none focus-visible:shadow-[0_16px_48px_rgb(0_0_0_/_0.45),0_0_0_4px_rgb(120_163_255_/_0.22)]',
  modalTitle: 'mb-2.5 mt-0 text-lg font-bold',
  modalDesc: 'mb-4 mt-0 text-mmc-base leading-snug text-white/76',
  modalActions: 'flex flex-wrap justify-end gap-2',
  archivedDetails:
    'mt-4 border-t border-white/10 pt-3 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:text-mmc-base [&_summary]:font-semibold [&_summary::-webkit-details-marker]:hidden',
  itemArchived: 'opacity-[0.92]',
  accountFatura: 'mt-2 text-mmc-sm text-mmc-muted',
  accountPayable: 'mt-1 text-[15px] font-bold text-mmc-payable',
  accountBalance: 'mt-2 text-mmc-base font-bold',
  accountBalanceSubtle: 'mt-1 text-mmc-sm font-medium text-mmc-muted',
  accountBalanceCompact: '!mt-1.5 !text-[13px]',
  payForm:
    'mt-3 grid grid-cols-1 gap-2.5 rounded-mmc-input border border-mmc-pwa-border bg-mmc-pay-form-bg p-3',
  payFormActions: 'flex flex-wrap justify-end gap-2',
  payOpen: 'mt-2.5 self-start',
  topNav: 'mb-4 mt-0 flex flex-wrap gap-2.5',
  checkboxLabel:
    '!flex-row !items-center gap-2.5 [&_input]:h-auto [&_input]:w-auto [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0',
} as const

type ConfirmDialogState =
  | null
  | { kind: 'delete-transaction'; transactionId: string }
  | { kind: 'archive-account'; accountId: string; displayName: string }

function RequireConfigured({ children }: { children: React.ReactNode }) {
  const ok = isSupabaseConfigured()
  if (ok) return children
  return (
    <div className={ui.container}>
      <header className={ui.header}>
        <div>
          <h1>My Money Control</h1>
          <p className={ui.muted}>Configuração necessária para usar a versão em nuvem.</p>
        </div>
      </header>
      <section className={ui.card}>
        <h2 className={ui.cardTitle}>Configure o Supabase</h2>
        <p className={ui.muted}>
          Para usar rotas protegidas (login obrigatório), defina as variáveis no arquivo <code>.env</code>:
        </p>
        <pre className={ui.codeBlock}>{`VITE_SUPABASE_URL=...\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}</pre>
        <p className={ui.muted}>
          Depois reinicie o <code>pnpm dev</code>. O passo a passo está em <code>README.md</code> e{' '}
          <code>docs/supabase-cloud-mvp.md</code>.
        </p>
      </section>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useStore((s) => s.auth.status)
  const session = useStore((s) => s.auth.session)
  const initAuth = useStore((s) => s.initAuth)
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

function LoginPage() {
  const authStatus = useStore((s) => s.auth.status)
  const authSession = useStore((s) => s.auth.session)
  const authError = useStore((s) => s.auth.authError)
  const initAuth = useStore((s) => s.initAuth)
  const signInWithPassword = useStore((s) => s.signInWithPassword)
  const clearAuthError = useStore((s) => s.clearAuthError)

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
      // `authError` também pode vir do slice, mas garantimos feedback imediato aqui.
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

function Dashboard() {
  const authStatus = useStore((s) => s.auth.status)
  const authSession = useStore((s) => s.auth.session)
  const signOut = useStore((s) => s.signOut)

  const txReady = useStore((s) => s.transactions.ready)
  const accReady = useStore((s) => s.accounts.ready)
  const catReady = useStore((s) => s.categories.ready)
  const categoriesInitError = useStore((s) => s.categories.initError)
  const authReady = authStatus === 'signedIn' || authStatus === 'signedOut'
  const ready = authReady && txReady && accReady && catReady
  const usingCloud =
    isSupabaseConfigured() && authStatus === 'signedIn' && Boolean(authSession?.user)

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

  const month = useStore((s) => s.transactions.filters.month)
  const typeFilter = useStore((s) => s.transactions.filters.type)
  const categoryFilter = useStore((s) => s.transactions.filters.category)
  const accountFilter = useStore((s) => s.transactions.filters.accountId)

  const categories = useStore((s) => s.categories.items)
  const rows = useStore((s) => s.transactions.items)
  const accounts = useStore((s) => s.accounts.items)
  const archivedAccounts = useStore((s) => s.accounts.archivedItems)
  const balancesByAccountId = useStore((s) => s.accounts.balancesByAccountId)
  const creditCardPayableByAccountId = useStore((s) => s.accounts.creditCardPayableByAccountId)

  const initTx = useStore((s) => s.transactionsInit)
  const initAcc = useStore((s) => s.accountsInit)
  const initCat = useStore((s) => s.categoriesInit)
  const addCategory = useStore((s) => s.addCategory)
  const updateCategory = useStore((s) => s.updateCategory)
  const deleteCategory = useStore((s) => s.deleteCategory)
  const setMonth = useStore((s) => s.setTransactionsMonth)
  const setTypeFilter = useStore((s) => s.setTransactionsType)
  const setCategoryFilter = useStore((s) => s.setTransactionsCategory)
  const setAccountFilter = useStore((s) => s.setTransactionsAccount)

  const add = useStore((s) => s.addTransaction)
  const update = useStore((s) => s.updateTransaction)
  const remove = useStore((s) => s.deleteTransaction)

  const addAccount = useStore((s) => s.addAccount)
  const setDefaultAccount = useStore((s) => s.setDefaultAccount)
  const archiveAccount = useStore((s) => s.archiveAccount)
  const unarchiveAccount = useStore((s) => s.unarchiveAccount)
  const getAccountOpeningForEdit = useStore((s) => s.getAccountOpeningForEdit)
  const updateAccountDetails = useStore((s) => s.updateAccountDetails)

  const [editingId, setEditingId] = useState<string | null>(null)

  const [notice, setNotice] = useState<null | { variant: 'error'; message: string }>(null)
  const [toast, setToast] = useState<null | { id: number; variant: 'success' | 'error'; message: string }>(
    null,
  )
  const toastSeq = useRef(0)
  const pushToast = useCallback((variant: 'success' | 'error', message: string, durationMs?: number) => {
    const id = ++toastSeq.current
    setToast({ id, variant, message })
    const ms = durationMs ?? (variant === 'error' ? 5200 : 3200)
    window.setTimeout(() => {
      setToast((t) => (t?.id === id ? null : t))
    }, ms)
  }, [])

  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBar, setShowInstallBar] = useState(false)

  const txFormAmountRef = useRef<HTMLInputElement>(null)
  const accountFormNameRef = useRef<HTMLInputElement>(null)

  const [submittingTx, setSubmittingTx] = useState(false)
  const [submittingAccount, setSubmittingAccount] = useState(false)
  const [submittingAccountEdit, setSubmittingAccountEdit] = useState(false)
  const [submittingPayInvoice, setSubmittingPayInvoice] = useState(false)
  const payInvoiceAmountRef = useRef<HTMLInputElement>(null)

  const [migratingLocal, setMigratingLocal] = useState(false)

  const [payInvoice, setPayInvoice] = useState<null | { cardId: string }>(null)
  const [payFromId, setPayFromId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(() => todayISODate())

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)
  const confirmTitleId = useId()
  const confirmDescId = useId()
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const confirmCancelRef = useRef<HTMLButtonElement>(null)

  const dismissConfirmDialog = useCallback(() => {
    const restore = previouslyFocusedRef.current
    setConfirmDialog(null)
    queueMicrotask(() => restore?.focus?.())
  }, [])

  useEffect(() => {
    const onOn = () => setOnline(true)
    const onOff = () => setOnline(false)
    window.addEventListener('online', onOn)
    window.addEventListener('offline', onOff)
    return () => {
      window.removeEventListener('online', onOn)
      window.removeEventListener('offline', onOff)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 380)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const installVisitsRecorded = useRef(false)
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    if (mq.matches) return

    const onBip = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)

    if (!installVisitsRecorded.current) {
      installVisitsRecorded.current = true
      if (!sessionStorage.getItem('mmc_visit_bumped')) {
        sessionStorage.setItem('mmc_visit_bumped', '1')
        const dismissed = localStorage.getItem('mmc_install_dismissed') === '1'
        const prev = parseInt(localStorage.getItem('mmc_visits') ?? '0', 10)
        const visits = Number.isFinite(prev) ? prev + 1 : 1
        localStorage.setItem('mmc_visits', String(visits))
        if (visits >= 3 && !dismissed) setShowInstallBar(true)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  useEffect(() => {
    if (!payInvoice) return
    payInvoiceAmountRef.current?.focus()
  }, [payInvoice])

  useEffect(() => {
    if (!confirmDialog) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissConfirmDialog()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const id = requestAnimationFrame(() => confirmCancelRef.current?.focus())
    return () => {
      document.body.style.overflow = prevOverflow
      cancelAnimationFrame(id)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [confirmDialog, dismissConfirmDialog])

  const editing = useMemo(
    () => rows.find((t) => t.id === editingId) ?? null,
    [editingId, rows],
  )

  const defaultAccountId = useMemo(() => {
    const d = accounts.find((a) => a.isDefault)
    return d?.id ?? accounts[0]?.id ?? ''
  }, [accounts])

  const [form, setForm] = useState(() => ({
    type: 'expense' as TransactionType,
    accountId: '',
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    date: todayISODate(),
    category: 'other' as string,
    description: '',
  }))

  const [accountForm, setAccountForm] = useState(() => ({
    name: '',
    type: 'bank' as AccountType,
    openingBalance: '',
    makeDefault: false,
  }))

  const [accountEdit, setAccountEdit] = useState<null | {
    id: string
    name: string
    type: AccountType
    openingBalance: string
    openingDate: string
  }>(null)

  const [categoryNewLabel, setCategoryNewLabel] = useState('')
  const [categoryEdit, setCategoryEdit] = useState<null | { id: string; label: string }>(null)
  const [submittingCategory, setSubmittingCategory] = useState(false)

  const initDataRef = useRef<string | null>(null)

  useEffect(() => {
    if (authStatus !== 'signedIn' && authStatus !== 'signedOut') return
    // Em dev, React StrictMode pode rodar effects duas vezes.
    // Também pode haver múltiplas transições de status durante o bootstrap.
    // Garantimos que o init de dados rode uma vez por "datasource" (local vs userId na nuvem).
    const key = authSession?.user?.id ? `cloud:${authSession.user.id}` : 'local'
    if (initDataRef.current === key) return
    initDataRef.current = key
    void initAcc()
    void initTx({ month: currentMonthYYYYMM() })
    void initCat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, authSession?.user?.id])

  useEffect(() => {
    if (!catReady || categories.length === 0) return
    const ids = new Set(categories.map((c) => c.id))
    if (form.type === 'transfer') return
    if (!ids.has(form.category)) {
      const fallback =
        (ids.has('other') ? 'other' : categories.find((c) => c.id !== 'transfer')?.id) ?? form.category
      setForm((f) => ({ ...f, category: fallback }))
    }
  }, [catReady, categories, form.category, form.type])

  useEffect(() => {
    if (defaultAccountId && !form.accountId) {
      setForm((f) => ({ ...f, accountId: defaultAccountId }))
    }
  }, [defaultAccountId, form.accountId])

  useEffect(() => {
    if (!editing) return
    if (editing.kind === 'opening_balance') {
      setForm({
        type: 'income',
        accountId: editing.accountId,
        fromAccountId: '',
        toAccountId: '',
        amount: String(editing.amountCents / 100),
        date: editing.date,
        category: editing.category,
        description: editing.description ?? '',
      })
      return
    }
    if (editing.type === 'transfer') {
      setForm({
        type: 'transfer',
        accountId: '',
        fromAccountId: editing.fromAccountId ?? '',
        toAccountId: editing.toAccountId ?? '',
        amount: String(editing.amountCents / 100),
        date: editing.date,
        category: 'transfer',
        description: editing.description ?? '',
      })
      return
    }
    setForm({
      type: editing.type,
      accountId: editing.accountId,
      fromAccountId: '',
      toAccountId: '',
      amount: String(editing.amountCents / 100),
      date: editing.date,
      category: editing.category,
      description: editing.description ?? '',
    })
  }, [editing])

  const summaryAccountKey = accountFilter === 'all' ? 'all' : accountFilter

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    let period = 0
    for (const t of rows) {
      period += summaryPeriodDelta(t, summaryAccountKey)
      if (t.kind !== 'normal') continue
      if (t.type === 'transfer') continue
      if (t.type === 'income') income += t.amountCents
      else expense += t.amountCents
    }
    return { income, expense, flow: income - expense, period }
  }, [rows, summaryAccountKey])

  const amountRaw = form.amount.trim().replace(',', '.')
  const amountNum = amountRaw.length > 0 ? Number(amountRaw) : Number.NaN
  const amountOk = form.amount.trim().length > 0 && Number.isFinite(amountNum)

  const canSubmit =
    editing?.kind === 'opening_balance'
      ? amountOk && amountNum !== 0
      : form.type === 'transfer'
        ? amountOk &&
          amountNum > 0 &&
          Boolean(form.fromAccountId) &&
          Boolean(form.toAccountId) &&
          form.fromAccountId !== form.toAccountId
        : amountOk && amountNum > 0

  const canSubmitAccount = accountForm.name.trim().length > 0 && accountEdit == null

  const accountEditOpeningRaw = accountEdit?.openingBalance.trim().replace(',', '.') ?? ''
  const accountEditOpeningValid =
    accountEditOpeningRaw.length === 0 || Number.isFinite(Number(accountEditOpeningRaw))
  const canSubmitAccountEdit =
    accountEdit != null &&
    accountEdit.name.trim().length > 0 &&
    accountEditOpeningValid

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || submittingTx) return

    setSubmittingTx(true)
    setNotice(null)
    try {
      if (editing?.kind === 'opening_balance') {
        const amountCents = Math.round(amountNum * 100)
        if (amountCents === 0) return
        await update(editing.id, {
          amountCents,
          date: form.date,
          description: form.description.trim() || undefined,
        })
        setEditingId(null)
        setForm((f) => ({ ...f, amount: '', description: '', date: todayISODate() }))
        pushToast('success', 'Saldo inicial atualizado.')
        queueMicrotask(() => txFormAmountRef.current?.focus())
        return
      }

      if (form.type === 'transfer') {
        const amountCents = Math.round(amountNum * 100)
        if (amountCents <= 0) return
        const desc = form.description.trim() || undefined
        if (editing?.type === 'transfer') {
          await update(editing.id, {
            type: 'transfer',
            fromAccountId: form.fromAccountId,
            toAccountId: form.toAccountId,
            amountCents,
            date: form.date,
            category: 'transfer',
            description: desc,
          })
          setEditingId(null)
          pushToast('success', 'Transferência atualizada.')
        } else {
          await add({
            type: 'transfer',
            fromAccountId: form.fromAccountId,
            toAccountId: form.toAccountId,
            amountCents,
            date: form.date,
            category: 'transfer',
            description: desc,
          })
          pushToast('success', 'Transferência registrada.')
        }
        setForm((f) => ({
          ...f,
          type: 'expense',
          fromAccountId: defaultAccountId,
          toAccountId: '',
          accountId: f.accountId || defaultAccountId,
          category: 'other',
          amount: '',
          description: '',
          date: todayISODate(),
        }))
        queueMicrotask(() => txFormAmountRef.current?.focus())
        return
      }

      const amountCents = Math.round(amountNum * 100)
      if (amountCents <= 0) return

      const accountId = form.accountId || defaultAccountId
      if (!accountId) {
        pushToast('error', 'Selecione uma conta.')
        return
      }

      const desc = form.description.trim() || undefined
      if (editing) {
        await update(editing.id, {
          type: form.type,
          accountId,
          amountCents,
          date: form.date,
          category: form.category,
          description: desc,
        })
        setEditingId(null)
        pushToast('success', 'Transação atualizada.')
      } else {
        await add({
          type: form.type,
          accountId,
          amountCents,
          date: form.date,
          category: form.category,
          description: desc,
        })
        pushToast('success', 'Transação adicionada.')
      }

      setForm((f) => ({ ...f, amount: '', description: '', date: todayISODate() }))
      queueMicrotask(() => txFormAmountRef.current?.focus())
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setSubmittingTx(false)
    }
  }

  async function onSubmitAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitAccount || accountEdit || submittingAccount) return

    setSubmittingAccount(true)
    setNotice(null)
    try {
      const obRaw = accountForm.openingBalance.trim().replace(',', '.')
      const openingBalanceCents =
        obRaw.length > 0 && Number.isFinite(Number(obRaw)) ? Math.round(Number(obRaw) * 100) : undefined

      await addAccount({
        name: accountForm.name.trim(),
        type: accountForm.type,
        makeDefault: accountForm.makeDefault,
        openingBalanceCents,
      })

      setAccountForm({ name: '', type: 'bank', openingBalance: '', makeDefault: false })
      pushToast('success', 'Conta criada.')
      queueMicrotask(() => accountFormNameRef.current?.focus())
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setSubmittingAccount(false)
    }
  }

  async function beginEditAccount(a: Account) {
    setNotice(null)
    try {
      const snap = await getAccountOpeningForEdit(a.id)
      setAccountEdit({
        id: a.id,
        name: a.name,
        type: a.type,
        openingBalance: snap.amountCents != null ? String(snap.amountCents / 100) : '',
        openingDate: snap.date,
      })
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    }
  }

  async function onSubmitAccountEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitAccountEdit || !accountEdit || submittingAccountEdit) return

    setSubmittingAccountEdit(true)
    setNotice(null)
    try {
      const raw = accountEdit.openingBalance.trim().replace(',', '.')
      let openingBalanceCents: number | null = null
      if (raw.length > 0) {
        if (!Number.isFinite(Number(raw))) {
          pushToast('error', 'Saldo inicial inválido.')
          return
        }
        const cents = Math.round(Number(raw) * 100)
        openingBalanceCents = cents === 0 ? null : cents
      }

      await updateAccountDetails(accountEdit.id, {
        name: accountEdit.name.trim(),
        type: accountEdit.type,
        openingBalanceCents,
        openingDate: accountEdit.openingDate,
      })
      setAccountEdit(null)
      pushToast('success', 'Conta atualizada.')
      queueMicrotask(() => accountFormNameRef.current?.focus())
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setSubmittingAccountEdit(false)
    }
  }

  function onConfirmDialogKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return
    const root = e.currentTarget
    const focusables = [...root.querySelectorAll<HTMLButtonElement>('button:not([disabled])')]
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  async function runDeleteTransaction(id: string) {
    setSubmittingTx(true)
    setNotice(null)
    try {
      await remove(id)
      if (editingId === id) setEditingId(null)
      pushToast('success', 'Transação excluída.')
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setSubmittingTx(false)
    }
  }

  function requestDeleteTransaction(id: string) {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    setConfirmDialog({ kind: 'delete-transaction', transactionId: id })
  }

  async function runArchiveAccountAction(id: string) {
    setNotice(null)
    try {
      await archiveAccount(id)
      pushToast('success', 'Conta arquivada.')
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    }
  }

  function requestArchiveAccount(id: string, displayName: string) {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    setConfirmDialog({ kind: 'archive-account', accountId: id, displayName })
  }

  async function handleConfirmDialogPrimary() {
    if (!confirmDialog) return
    const state = confirmDialog
    const restore = previouslyFocusedRef.current
    setConfirmDialog(null)
    queueMicrotask(() => restore?.focus?.())
    if (state.kind === 'delete-transaction') await runDeleteTransaction(state.transactionId)
    else await runArchiveAccountAction(state.accountId)
  }

  async function handleSetDefaultAccount(id: string) {
    setNotice(null)
    try {
      await setDefaultAccount(id)
      pushToast('success', 'Conta padrão atualizada.')
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    }
  }

  async function handleUnarchiveAccount(id: string) {
    setNotice(null)
    try {
      await unarchiveAccount(id)
      pushToast('success', 'Conta restaurada.')
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    }
  }

  function accountName(id: string) {
    return (
      accounts.find((a) => a.id === id)?.name ?? archivedAccounts.find((a) => a.id === id)?.name ?? id
    )
  }

  const payRaw = payAmount.trim().replace(',', '.')
  const payNum = payRaw.length > 0 ? Number(payRaw) : Number.NaN
  const canSubmitPayInvoice =
    payInvoice != null &&
    payFromId.length > 0 &&
    payFromId !== payInvoice.cardId &&
    payAmount.trim().length > 0 &&
    Number.isFinite(payNum) &&
    Math.round(payNum * 100) > 0

  function openPayInvoice(cardId: string) {
    setPayInvoice({ cardId })
    const suggested = creditCardPayableByAccountId[cardId] ?? 0
    setPayAmount(suggested > 0 ? String(suggested / 100) : '')
    setPayDate(todayISODate())
    const from =
      accounts.find((a) => a.isDefault && a.id !== cardId && a.type !== 'credit_card')?.id ??
      accounts.find((a) => a.id !== cardId && a.type !== 'credit_card')?.id ??
      defaultAccountId
    setPayFromId(from)
  }

  async function onSubmitPayInvoice(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitPayInvoice || !payInvoice || submittingPayInvoice) return

    const amountCents = Math.round(payNum * 100)
    const nm = accountName(payInvoice.cardId)
    const label = formatMonthYearForDisplay(currentMonthYYYYMM())

    setSubmittingPayInvoice(true)
    setNotice(null)
    try {
      if (payFromId === payInvoice.cardId) {
        pushToast('error', 'Escolha outra conta para debitar o pagamento.')
        return
      }
      await add({
        type: 'transfer',
        fromAccountId: payFromId,
        toAccountId: payInvoice.cardId,
        amountCents,
        date: payDate,
        category: 'transfer',
        description: `Pagamento fatura — ${nm} (${label})`,
      })
      setPayInvoice(null)
      pushToast('success', 'Pagamento de fatura registrado.')
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setSubmittingPayInvoice(false)
    }
  }

  const faturaMesLabel = formatMonthYearForDisplay(currentMonthYYYYMM())

  async function onMigrateLocalToCloud() {
    const uid = authSession?.user?.id
    if (!uid || migratingLocal) return
    setMigratingLocal(true)
    setNotice(null)
    try {
      const r = await migrateLocalDexieToCloud()
      pushToast(
        'success',
        r.accounts + r.transactions === 0
          ? 'Não havia dados locais novos para enviar.'
          : `Enviadas ${r.accounts} conta(s) e ${r.transactions} transação(ões).`,
        6500,
      )
      await initAcc()
      await initTx({ month })
      await initCat()
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setMigratingLocal(false)
    }
  }

  async function onAddCategory(e: React.FormEvent) {
    e.preventDefault()
    const label = categoryNewLabel.trim()
    if (!label || submittingCategory) return
    setSubmittingCategory(true)
    try {
      await addCategory(label)
      setCategoryNewLabel('')
      pushToast('success', 'Categoria criada.')
    } catch (err) {
      pushToast('error', errMessage(err))
    } finally {
      setSubmittingCategory(false)
    }
  }

  async function onSaveCategoryEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryEdit || submittingCategory) return
    const label = categoryEdit.label.trim()
    if (!label) return
    setSubmittingCategory(true)
    try {
      await updateCategory(categoryEdit.id, label)
      setCategoryEdit(null)
      pushToast('success', 'Categoria atualizada.')
    } catch (err) {
      pushToast('error', errMessage(err))
    } finally {
      setSubmittingCategory(false)
    }
  }

  async function onDeleteCategory(id: string) {
    try {
      await deleteCategory(id)
      pushToast('success', 'Categoria excluída.')
    } catch (err) {
      pushToast('error', errMessage(err))
    }
  }

  function renderTransactionFormCard() {
    return (
      <div className={ui.card}>
        <h2 className={ui.cardTitle}>
          {editing
            ? editing.kind === 'opening_balance'
              ? 'Saldo inicial'
              : editing.type === 'transfer'
                ? 'Editar transferência'
                : 'Editar transação'
            : 'Nova transação'}
        </h2>
        <form className={ui.form} onSubmit={onSubmit}>
          {editing?.kind !== 'opening_balance' ? (
            <label>
              <span>Tipo</span>
              <select
                value={form.type}
                disabled={Boolean(editing)}
                onChange={(e) => {
                  const t = e.target.value as TransactionType
                  setForm((f) => ({
                    ...f,
                    type: t,
                    fromAccountId: t === 'transfer' ? f.fromAccountId || defaultAccountId : '',
                    toAccountId: t === 'transfer' ? f.toAccountId : '',
                    accountId: t !== 'transfer' ? f.accountId || defaultAccountId : f.accountId,
                    category:
                      t === 'transfer' ? 'transfer' : f.category === 'transfer' ? 'other' : f.category,
                  }))
                }}
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
                <option value="transfer">Transferência</option>
              </select>
            </label>
          ) : null}

          <label>
            <span>Valor (R$)</span>
            <input
              ref={txFormAmountRef}
              inputMode="decimal"
              autoComplete="off"
              maxLength={24}
              placeholder={editing?.kind === 'opening_balance' ? 'pode ser negativo' : 'ex.: 25,90'}
              title="Use ponto ou vírgula para centavos"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  amount: e.target.value.replace(',', '.').replace(/[^\d.-]/g, ''),
                }))
              }
            />
          </label>

          <label>
            <span>Data</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </label>

          {editing?.kind !== 'opening_balance' && form.type === 'transfer' ? (
            <>
              <label>
                <span>De (origem)</span>
                <select
                  value={form.fromAccountId || defaultAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, fromAccountId: e.target.value }))}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Para (destino)</span>
                <select
                  value={form.toAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, toAccountId: e.target.value }))}
                >
                  <option value="">Selecione…</option>
                  {accounts
                    .filter((a) => a.id !== (form.fromAccountId || defaultAccountId))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          ) : null}

          {editing?.kind !== 'opening_balance' && form.type !== 'transfer' ? (
            <>
              <label>
                <span>Conta</span>
                <select
                  value={form.accountId || defaultAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Categoria</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {categories
                    .filter((c) => c.id !== 'transfer')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                </select>
              </label>
            </>
          ) : null}

          {editing?.kind === 'opening_balance' ? (
            <label className={ui.formFull}>
              <span>Conta</span>
              <input readOnly value={accountName(editing.accountId)} />
            </label>
          ) : null}

          <label className={ui.formFull}>
            <span>Descrição (opcional)</span>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>

          <div className={ui.actions}>
            {editing ? (
              <>
                <button
                  type="button"
                  className={`${ui.btnGhost} ${ui.btnWithIcon}`}
                  onClick={() => setEditingId(null)}
                >
                  <X className={ui.btnIcon} aria-hidden />
                  <span>Voltar</span>
                </button>
                <button type="submit" disabled={!canSubmit || submittingTx} className={ui.btnWithIcon}>
                  {submittingTx ? (
                    <Loader2 className={ui.btnIconSpin} aria-hidden />
                  ) : (
                    <Check className={ui.btnIcon} aria-hidden />
                  )}
                  <span>{submittingTx ? 'Salvando…' : 'Salvar'}</span>
                </button>
              </>
            ) : (
              <button type="submit" disabled={!canSubmit || submittingTx} className={ui.btnWithIcon}>
                {submittingTx ? (
                  <Loader2 className={ui.btnIconSpin} aria-hidden />
                ) : (
                  <Plus className={ui.btnIcon} aria-hidden />
                )}
                <span>{submittingTx ? 'Salvando…' : 'Incluir'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    )
  }

  function renderTransactionListCard() {
    return (
      <div className={ui.card}>
        <h2 className={ui.cardTitle}>Transações</h2>
        {rows.length === 0 ? (
          <div className={ui.emptyState}>
            <Inbox className={ui.emptyIcon} aria-hidden />
            <p className={ui.emptyTitle}>Nenhuma transação neste período</p>
            <p className={ui.muted}>
              Ajuste mês, conta ou tipo nos filtros — ou inclua um lançamento{' '}
              {view === 'transactions' ? 'no formulário ao lado' : 'no formulário acima'}.
            </p>
          </div>
        ) : (
          <ul className={ui.list}>
            {rows.map((t) => (
              <li key={t.id} className={`${ui.item} ${ui.itemRow}`}>
                <div className={ui.itemMain}>
                  <div className={ui.txAmount}>
                    {t.kind === 'opening_balance' ? (
                      <strong className={ui.neutral}>{signedFormatCents(t.amountCents)}</strong>
                    ) : t.type === 'transfer' ? (
                      <strong className={ui.neutral}>↔ {formatCents(t.amountCents)}</strong>
                    ) : (
                      <strong className={t.type === 'income' ? ui.positive : ui.negative}>
                        {t.type === 'income' ? '+' : '−'} {formatCents(t.amountCents)}
                      </strong>
                    )}
                  </div>
                  <div className={ui.txDetail}>
                    {t.kind === 'opening_balance' ? (
                      <>Saldo inicial • {accountName(t.accountId)}</>
                    ) : t.type === 'transfer' ? (
                      <>
                        Transferência • {accountName(t.fromAccountId ?? '')} →{' '}
                        {accountName(t.toAccountId ?? '')}
                        {t.description ? ` • ${t.description}` : ''}
                      </>
                    ) : (
                      <>
                        {categories.find((c) => c.id === t.category)?.label ?? t.category} •{' '}
                        {accountName(t.accountId)}
                        {t.description ? ` • ${t.description}` : ''}
                      </>
                    )}
                  </div>
                </div>
                <div className={ui.itemAside}>
                  <span className={ui.itemAsideMeta}>{formatISODateForDisplay(t.date)}</span>
                  <div className={ui.itemActions}>
                    <button
                      type="button"
                      className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                      onClick={() => setEditingId(t.id)}
                      aria-label="Editar transação"
                      title="Editar"
                    >
                      <Pencil className={ui.btnIcon} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={`${ui.btnDanger} ${ui.btnIconAsideDanger}`}
                      onClick={() => void requestDeleteTransaction(t.id)}
                      aria-label="Excluir transação"
                      title="Excluir"
                    >
                      <Trash2 className={ui.btnIcon} aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const showPwaInstallChrome =
    showInstallBar &&
    installPrompt != null &&
    !window.matchMedia('(display-mode: standalone)').matches

  async function onPwaInstallClick() {
    const p = installPrompt
    if (!p) return
    await p.prompt()
    setInstallPrompt(null)
    setShowInstallBar(false)
    void p.userChoice
  }

  function dismissPwaInstall() {
    localStorage.setItem('mmc_install_dismissed', '1')
    setShowInstallBar(false)
  }

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
                  onClick={() => void signOut()}
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

      {view === 'categories' ? (
        <section className={ui.gridSingle}>
          <div className={ui.card}>
            <h2 className={ui.cardTitle}>Gerenciar categorias</h2>
            <p className={ui.hintBlock}>
              Use categorias como &quot;Ajuste&quot; para alinhar faturas sem lançar tudo retroativamente. A
              categoria &quot;Transferência&quot; é reservada ao app. Não dá para excluir uma categoria que
              ainda tenha lançamentos — altere ou apague esses lançamentos antes.
            </p>
            <form
              className={`${ui.form} ${ui.accountForm}`}
              onSubmit={(e) => {
                void onAddCategory(e)
              }}
            >
              <label className={ui.formFull}>
                <span>Nova categoria</span>
                <input
                  value={categoryNewLabel}
                  onChange={(e) => setCategoryNewLabel(e.target.value)}
                  placeholder="ex.: Ajuste"
                  maxLength={80}
                  autoComplete="off"
                  disabled={Boolean(categoriesInitError)}
                />
              </label>
              <div className={ui.actions}>
                <button
                  type="submit"
                  disabled={
                    submittingCategory ||
                    !categoryNewLabel.trim() ||
                    Boolean(categoriesInitError)
                  }
                  className={ui.btnWithIcon}
                >
                  {submittingCategory ? (
                    <Loader2 className={ui.btnIconSpin} aria-hidden />
                  ) : (
                    <Plus className={ui.btnIcon} aria-hidden />
                  )}
                  <span>{submittingCategory ? 'Salvando…' : 'Incluir'}</span>
                </button>
              </div>
            </form>

            {!catReady ? (
              <p className={ui.muted}>Carregando…</p>
            ) : categoriesInitError ? (
              <p className={ui.muted}>
                Lista indisponível até o Supabase estar correto. Use o aviso acima e &quot;Tentar
                novamente&quot;.
              </p>
            ) : categories.length === 0 ? (
              <p className={ui.muted}>Nenhuma categoria.</p>
            ) : (
              <ul className={ui.list}>
                {categories.map((c) => (
                  <li key={c.id} className={`${ui.item} ${ui.itemRow}`}>
                    <div className={ui.itemMain}>
                      {categoryEdit?.id === c.id ? (
                        <form
                          className={`${ui.form} ${ui.accountForm}`}
                          onSubmit={(e) => {
                            void onSaveCategoryEdit(e)
                          }}
                        >
                          <label className={ui.formFull}>
                            <span>Nome</span>
                            <input
                              value={categoryEdit.label}
                              onChange={(e) =>
                                setCategoryEdit((x) => (x ? { ...x, label: e.target.value } : x))
                              }
                              maxLength={80}
                            />
                          </label>
                          <div className={ui.actions}>
                            <button
                              type="button"
                              className={`${ui.btnGhost} ${ui.btnWithIcon}`}
                              onClick={() => setCategoryEdit(null)}
                            >
                              <X className={ui.btnIcon} aria-hidden />
                              <span>Voltar</span>
                            </button>
                            <button type="submit" disabled={submittingCategory} className={ui.btnWithIcon}>
                              {submittingCategory ? (
                                <Loader2 className={ui.btnIconSpin} aria-hidden />
                              ) : (
                                <Check className={ui.btnIcon} aria-hidden />
                              )}
                              <span>{submittingCategory ? 'Salvando…' : 'Salvar'}</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className={ui.itemHead}>
                            <div className={ui.itemHeadMain}>
                              <strong>{c.label}</strong>
                              {c.system ? <span className={ui.tag}>Sistema</span> : null}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {categoryEdit?.id !== c.id ? (
                      <div className={ui.itemAside}>
                        <span className={ui.itemAsideMeta} title={c.id}>
                          {c.id}
                        </span>
                        {!c.system ? (
                          <div className={ui.itemActions}>
                            <button
                              type="button"
                              className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                              aria-label={`Editar ${c.label}`}
                              title="Editar"
                              onClick={() => setCategoryEdit({ id: c.id, label: c.label })}
                            >
                              <Pencil className={ui.btnIcon} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className={`${ui.btnDanger} ${ui.btnIconAsideDanger}`}
                              aria-label={`Excluir ${c.label}`}
                              title="Excluir"
                              onClick={() => void onDeleteCategory(c.id)}
                            >
                              <Trash2 className={ui.btnIcon} aria-hidden />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

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
        <section className={ui.grid}>
          <div className={ui.stickyFilters}>
            <h2 className={ui.cardTitle}>Filtros</h2>
            <p className={ui.periodLabel}>Período: {formatMonthYearForDisplay(month)}</p>
            <div className={ui.row4}>
              <label>
                <span>Mês</span>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </label>

              <label>
                <span>Conta</span>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value as typeof accountFilter)}
                >
                  <option value="all">Todas</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.isDefault ? ' (padrão)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Tipo</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
                >
                  <option value="all">Todos</option>
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                  <option value="transfer">Transferência</option>
                </select>
              </label>

              <label>
                <span>Categoria</span>
                <select
                  value={categoryFilter ?? 'all'}
                  onChange={(e) => setCategoryFilter(e.target.value === 'all' ? null : e.target.value)}
                >
                  <option value="all">Todas</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className={ui.card}>
            <h2 className={ui.cardTitle}>Resumo — {formatMonthYearForDisplay(month)}</h2>
            <div className={ui.summaryGrid}>
              <div>
                <div className={ui.muted}>Receitas</div>
                <div className={ui.value}>{formatCents(summary.income)}</div>
              </div>
              <div>
                <div className={ui.muted}>Despesas</div>
                <div className={ui.value}>{formatCents(summary.expense)}</div>
              </div>
              <div>
                <div className={ui.muted}>Resultado</div>
                <div className={`${ui.value} ${summary.flow >= 0 ? ui.positive : ui.negative}`}>
                  {formatCents(summary.flow)}
                </div>
                <div className={ui.hint}>Receitas − despesas (sem saldo inicial nem transferências)</div>
              </div>
              <div>
                <div className={ui.muted}>Saldo no período</div>
                <div className={`${ui.value} ${summary.period >= 0 ? ui.positive : ui.negative}`}>
                  {formatCents(summary.period)}
                </div>
                <div className={ui.hint}>Inclui saldo inicial e movimentos</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {showAccounts ? (
      <section className={showTxWorkspace ? ui.grid : ui.gridSingle}>
        <div className={ui.card}>
          <h2 className={ui.cardTitle}>Contas</h2>
          <p className={ui.hintBlock}>
            Saldo por conta = histórico completo. Em cartões, &quot;A pagar&quot; usa sempre o{' '}
            <strong>mês civil atual</strong> (independente do filtro da lista).
          </p>
          <div className={accountEdit ? ui.accountFormDisabled : undefined}>
            <form className={`${ui.form} ${ui.accountForm}`} onSubmit={onSubmitAccount}>
              <label className={ui.formFull}>
                <span>Nome</span>
                <input
                  ref={accountFormNameRef}
                  placeholder="ex.: Bradesco"
                  autoComplete="off"
                  maxLength={120}
                  value={accountForm.name}
                  onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label>
                <span>Tipo</span>
                <select
                  value={accountForm.type}
                  onChange={(e) => setAccountForm((f) => ({ ...f, type: e.target.value as AccountType }))}
                >
                  <option value="bank">Banco</option>
                  <option value="wallet">Carteira</option>
                  <option value="credit_card">Cartão de crédito</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <label>
                <span>Saldo inicial (opcional)</span>
                <input
                  inputMode="decimal"
                  placeholder="ex.: 1500 ou −200"
                  value={accountForm.openingBalance}
                  onChange={(e) =>
                    setAccountForm((f) => ({ ...f, openingBalance: e.target.value.replace(',', '.') }))
                  }
                />
              </label>
              <label className={ui.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={accountForm.makeDefault}
                  onChange={(e) => setAccountForm((f) => ({ ...f, makeDefault: e.target.checked }))}
                />
                <span>Definir como conta padrão</span>
              </label>
              <div className={ui.actions}>
                <button
                  type="submit"
                  disabled={!canSubmitAccount || submittingAccount}
                  className={ui.btnWithIcon}
                >
                  {submittingAccount ? (
                    <Loader2 className={ui.btnIconSpin} aria-hidden />
                  ) : (
                    <Plus className={ui.btnIcon} aria-hidden />
                  )}
                  <span>{submittingAccount ? 'Salvando…' : 'Incluir conta'}</span>
                </button>
              </div>
            </form>
          </div>

          {accountEdit ? (
            <form className={`${ui.accountEditForm} ${ui.accountForm}`} onSubmit={onSubmitAccountEdit}>
              <h3 className={ui.accountEditTitle}>Editar conta</h3>
              <p className={`${ui.hint} ${ui.formFull}`}>
                Ajuste nome, tipo ou saldo inicial. Deixe o saldo vazio para remover o lançamento de saldo
                inicial.
              </p>
              <label className={ui.formFull}>
                <span>Nome</span>
                <input
                  value={accountEdit.name}
                  onChange={(e) => setAccountEdit((f) => (f ? { ...f, name: e.target.value } : f))}
                />
              </label>
              <label>
                <span>Tipo</span>
                <select
                  value={accountEdit.type}
                  onChange={(e) =>
                    setAccountEdit((f) => (f ? { ...f, type: e.target.value as AccountType } : f))
                  }
                >
                  <option value="bank">Banco</option>
                  <option value="wallet">Carteira</option>
                  <option value="credit_card">Cartão de crédito</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <label>
                <span>Saldo inicial</span>
                <input
                  inputMode="decimal"
                  placeholder="vazio = sem saldo inicial"
                  value={accountEdit.openingBalance}
                  onChange={(e) =>
                    setAccountEdit((f) =>
                      f ? { ...f, openingBalance: e.target.value.replace(',', '.') } : f,
                    )
                  }
                />
              </label>
              <label>
                <span>Data do saldo inicial</span>
                <input
                  type="date"
                  value={accountEdit.openingDate}
                  onChange={(e) => setAccountEdit((f) => (f ? { ...f, openingDate: e.target.value } : f))}
                />
              </label>
              <div className={ui.actions}>
                <button
                  type="button"
                  className={`${ui.btnGhost} ${ui.btnWithIcon}`}
                  onClick={() => setAccountEdit(null)}
                >
                  <X className={ui.btnIcon} aria-hidden />
                  <span>Voltar</span>
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitAccountEdit || submittingAccountEdit}
                  className={ui.btnWithIcon}
                >
                  {submittingAccountEdit ? (
                    <Loader2 className={ui.btnIconSpin} aria-hidden />
                  ) : (
                    <Check className={ui.btnIcon} aria-hidden />
                  )}
                  <span>{submittingAccountEdit ? 'Salvando…' : 'Salvar'}</span>
                </button>
              </div>
            </form>
          ) : null}
          {accounts.length === 0 ? (
            <div className={ui.emptyState}>
              <WalletCards className={ui.emptyIcon} aria-hidden />
              <p className={ui.emptyTitle}>Nenhuma conta cadastrada</p>
              <p className={ui.muted}>
                Crie uma conta (banco, carteira ou cartão) no formulário acima para começar a lançar
                transações.
              </p>
            </div>
          ) : (
            <ul className={ui.list}>
              {accounts.map((a: Account) => (
                <li
                  key={a.id}
                  className={`${ui.item} ${ui.itemRow} ${a.type === 'credit_card' ? ui.itemRowTall : ''}`}
                >
                  <div className={ui.itemMain}>
                    <div className={ui.itemHead}>
                      <div className={ui.itemHeadMain}>
                        <strong>{a.name}</strong>
                        {a.isDefault ? <span className={ui.tag}>Padrão</span> : null}
                      </div>
                    </div>
                    {a.type === 'credit_card' ? (
                      <>
                        <div className={`${ui.accountFatura} ${ui.muted}`}>Fatura ({faturaMesLabel})</div>
                        <div className={ui.accountPayable}>
                          A pagar: {formatCents(creditCardPayableByAccountId[a.id] ?? 0)}
                        </div>
                        <div className={`${ui.accountBalanceSubtle} ${ui.muted}`}>
                          Saldo (contábil): {formatCents(balancesByAccountId[a.id] ?? 0)}
                        </div>
                        {payInvoice?.cardId === a.id ? (
                          <form className={ui.payForm} onSubmit={onSubmitPayInvoice}>
                            <label>
                              <span>Pagar de</span>
                              <select
                                value={payFromId}
                                onChange={(e) => setPayFromId(e.target.value)}
                              >
                                {(accounts.filter((x) => x.id !== a.id && x.type !== 'credit_card').length > 0
                                  ? accounts.filter((x) => x.id !== a.id && x.type !== 'credit_card')
                                  : accounts.filter((x) => x.id !== a.id)
                                ).map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>Valor (R$)</span>
                              <input
                                ref={payInvoiceAmountRef}
                                inputMode="decimal"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value.replace(',', '.'))}
                              />
                            </label>
                            <label>
                              <span>Data</span>
                              <input
                                type="date"
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
                              />
                            </label>
                            <div className={ui.payFormActions}>
                              <button
                                type="button"
                                className={`${ui.btnGhost} ${ui.btnWithIcon}`}
                                onClick={() => setPayInvoice(null)}
                              >
                                <X className={ui.btnIcon} aria-hidden />
                                <span>Voltar</span>
                              </button>
                              <button
                                type="submit"
                                disabled={!canSubmitPayInvoice || submittingPayInvoice}
                                className={ui.btnWithIcon}
                              >
                                {submittingPayInvoice ? (
                                  <Loader2 className={ui.btnIconSpin} aria-hidden />
                                ) : (
                                  <Check className={ui.btnIcon} aria-hidden />
                                )}
                                <span>{submittingPayInvoice ? 'Registrando…' : 'Registrar'}</span>
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            className={`${ui.btnGhost} ${ui.payOpen} ${ui.btnWithIcon}`}
                            onClick={() => openPayInvoice(a.id)}
                          >
                            <CreditCard className={ui.btnIcon} aria-hidden />
                            <span>Pagar fatura</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div
                        className={`${ui.accountBalance} ${
                          (balancesByAccountId[a.id] ?? 0) >= 0 ? ui.positive : ui.negative
                        }`}
                      >
                        Saldo: {formatCents(balancesByAccountId[a.id] ?? 0)}
                      </div>
                    )}
                  </div>
                  <div className={a.type === 'credit_card' ? ui.itemAsideTall : ui.itemAside}>
                    <span className={ui.itemAsideMeta} title={ACCOUNT_TYPE_LABEL[a.type]}>
                      {ACCOUNT_TYPE_LABEL[a.type]}
                    </span>
                    <div className={ui.itemActions}>
                      <button
                        type="button"
                        className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                        onClick={() => {
                          void beginEditAccount(a)
                        }}
                        aria-label={`Editar conta ${a.name}`}
                        title="Editar"
                      >
                        <Pencil className={ui.btnIcon} aria-hidden />
                      </button>
                      {!a.isDefault ? (
                        <button
                          type="button"
                          className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                          onClick={() => void handleSetDefaultAccount(a.id)}
                          aria-label="Definir como conta padrão"
                          title="Conta padrão"
                        >
                          <Star className={ui.btnIcon} aria-hidden />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`${ui.btnDanger} ${ui.btnIconAsideDanger}`}
                        disabled={accounts.length <= 1}
                        onClick={() => void requestArchiveAccount(a.id, a.name)}
                        aria-label={`Arquivar conta ${a.name}`}
                        title="Arquivar"
                      >
                        <Archive className={ui.btnIcon} aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {archivedAccounts.length > 0 ? (
            <details className={ui.archivedDetails}>
              <summary>
                Contas arquivadas <span className={ui.muted}>({archivedAccounts.length})</span>
              </summary>
              <ul className={ui.list}>
                {archivedAccounts.map((a: Account) => (
                  <li
                    key={a.id}
                    className={`${ui.item} ${ui.itemArchived} ${ui.itemRow} ${
                      a.type === 'credit_card' ? ui.itemRowTall : ''
                    }`}
                  >
                    <div className={ui.itemMain}>
                      <div className={ui.itemHead}>
                        <div className={ui.itemHeadMain}>
                          <strong>{a.name}</strong>
                          {a.isDefault ? <span className={ui.tag}>Padrão</span> : null}
                        </div>
                      </div>
                      {a.type === 'credit_card' ? (
                        <>
                          <div className={`${ui.accountFatura} ${ui.muted}`}>Fatura ({faturaMesLabel})</div>
                          <div className={`${ui.accountPayable} ${ui.accountBalanceCompact}`}>
                            A pagar: {formatCents(creditCardPayableByAccountId[a.id] ?? 0)}
                          </div>
                          <div
                            className={`${ui.accountBalanceSubtle} ${ui.muted} ${ui.accountBalanceCompact}`}
                          >
                            Saldo (contábil): {formatCents(balancesByAccountId[a.id] ?? 0)}
                          </div>
                        </>
                      ) : (
                        <div
                          className={`${ui.accountBalance} ${ui.accountBalanceCompact} ${
                            (balancesByAccountId[a.id] ?? 0) >= 0 ? ui.positive : ui.negative
                          }`}
                        >
                          Saldo: {formatCents(balancesByAccountId[a.id] ?? 0)}
                        </div>
                      )}
                    </div>
                    <div className={a.type === 'credit_card' ? ui.itemAsideTall : ui.itemAside}>
                      <span className={ui.itemAsideMeta} title={ACCOUNT_TYPE_LABEL[a.type]}>
                        {ACCOUNT_TYPE_LABEL[a.type]}
                      </span>
                      <div className={ui.itemActions}>
                        <button
                          type="button"
                          className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                          onClick={() => {
                            void beginEditAccount(a)
                          }}
                          aria-label={`Editar conta ${a.name}`}
                          title="Editar"
                        >
                          <Pencil className={ui.btnIcon} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                          onClick={() => void handleUnarchiveAccount(a.id)}
                          aria-label={`Restaurar conta ${a.name}`}
                          title="Restaurar"
                        >
                          <Undo2 className={ui.btnIcon} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        {showTxWorkspace ? renderTransactionFormCard() : null}
      </section>
      ) : null}

      {!showAccounts && showTxWorkspace ? (
        <section className={ui.grid}>
          {renderTransactionFormCard()}
          {renderTransactionListCard()}
        </section>
      ) : null}

      {showAccounts && showTxWorkspace ? (
        <section className={ui.gridSingle}>{renderTransactionListCard()}</section>
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

      {confirmDialog ? (
        <div
          className={ui.modalRoot}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismissConfirmDialog()
          }}
        >
          <div
            className={ui.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmDescId}
            onKeyDown={onConfirmDialogKeyDown}
          >
            <h2 id={confirmTitleId} className={ui.modalTitle}>
              {confirmDialog.kind === 'delete-transaction'
                ? 'Excluir transação?'
                : 'Arquivar conta?'}
            </h2>
            <p id={confirmDescId} className={ui.modalDesc}>
              {confirmDialog.kind === 'delete-transaction'
                ? 'Esta ação não pode ser desfeita. A transação será removida permanentemente.'
                : `Arquivar a conta “${confirmDialog.displayName}”? Você pode restaurá-la depois em contas arquivadas.`}
            </p>
            <div className={ui.modalActions}>
              <button
                ref={confirmCancelRef}
                type="button"
                className={`${ui.btnGhost} ${ui.btnWithIcon}`}
                onClick={dismissConfirmDialog}
              >
                <X className={ui.btnIcon} aria-hidden />
                <span>Voltar</span>
              </button>
              <button
                type="button"
                className={
                  confirmDialog.kind === 'delete-transaction'
                    ? `${ui.btnDanger} ${ui.btnWithIcon}`
                    : ui.btnWithIcon
                }
                onClick={() => void handleConfirmDialogPrimary()}
              >
                {confirmDialog.kind === 'delete-transaction' ? (
                  <Trash2 className={ui.btnIcon} aria-hidden />
                ) : (
                  <Archive className={ui.btnIcon} aria-hidden />
                )}
                <span>{confirmDialog.kind === 'delete-transaction' ? 'Excluir' : 'Arquivar'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RequireConfigured>
            <LoginPage />
          </RequireConfigured>
        }
      />
      <Route
        path="/"
        element={
          <RequireConfigured>
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          </RequireConfigured>
        }
      />
      <Route
        path="/transactions"
        element={
          <RequireConfigured>
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          </RequireConfigured>
        }
      />
      <Route
        path="/accounts"
        element={
          <RequireConfigured>
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          </RequireConfigured>
        }
      />
      <Route
        path="/categories"
        element={
          <RequireConfigured>
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          </RequireConfigured>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

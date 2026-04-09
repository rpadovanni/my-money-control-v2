import './App.css'
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

type ConfirmDialogState =
  | null
  | { kind: 'delete-transaction'; transactionId: string }
  | { kind: 'archive-account'; accountId: string; displayName: string }

function RequireConfigured({ children }: { children: React.ReactNode }) {
  const ok = isSupabaseConfigured()
  if (ok) return children
  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>My Money Control</h1>
          <p className="muted">Configuração necessária para usar a versão em nuvem.</p>
        </div>
      </header>
      <section className="card">
        <h2>Configure o Supabase</h2>
        <p className="muted">
          Para usar rotas protegidas (login obrigatório), defina as variáveis no arquivo <code>.env</code>:
        </p>
        <pre className="code-block">{`VITE_SUPABASE_URL=...\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}</pre>
        <p className="muted">
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
      <div className="container">
        <section className="card">
          <p className="muted">Verificando sessão…</p>
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
    <div className="container">
      <header className="header">
        <div>
          <h1>My Money Control</h1>
          <p className="muted">Entre para acessar seus dados na nuvem.</p>
        </div>
        <div className="pill">
          {authStatus === 'loading' || authStatus === 'idle' ? 'Sessão…' : authSession?.user ? 'Logado' : 'Login'}
        </div>
      </header>

      <section className="card cloud-panel" aria-label="Login">
        <h2>Login</h2>
        {authError ? (
          <p className="cloud-auth-error" role="alert">
            {authError}
          </p>
        ) : null}
        <form className="cloud-panel-form" onSubmit={(e) => void onAuthSignIn(e)}>
          <div className="row row-2">
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
          <div className="row-actions">
            <button type="submit" disabled={authBusy} className="btn-with-icon">
              {authBusy ? (
                <Loader2 className="btn-icon icon-spin" aria-hidden />
              ) : (
                <LogIn className="btn-icon" aria-hidden />
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
      <div className="card">
        <h2>
          {editing
            ? editing.kind === 'opening_balance'
              ? 'Saldo inicial'
              : editing.type === 'transfer'
                ? 'Editar transferência'
                : 'Editar transação'
            : 'Nova transação'}
        </h2>
        <form className="form" onSubmit={onSubmit}>
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
            <label className="full">
              <span>Conta</span>
              <input readOnly value={accountName(editing.accountId)} />
            </label>
          ) : null}

          <label className="full">
            <span>Descrição (opcional)</span>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>

          <div className="actions">
            {editing ? (
              <>
                <button
                  type="button"
                  className="ghost btn-with-icon"
                  onClick={() => setEditingId(null)}
                >
                  <X className="btn-icon" aria-hidden />
                  <span>Voltar</span>
                </button>
                <button type="submit" disabled={!canSubmit || submittingTx} className="btn-with-icon">
                  {submittingTx ? (
                    <Loader2 className="btn-icon icon-spin" aria-hidden />
                  ) : (
                    <Check className="btn-icon" aria-hidden />
                  )}
                  <span>{submittingTx ? 'Salvando…' : 'Salvar'}</span>
                </button>
              </>
            ) : (
              <button type="submit" disabled={!canSubmit || submittingTx} className="btn-with-icon">
                {submittingTx ? (
                  <Loader2 className="btn-icon icon-spin" aria-hidden />
                ) : (
                  <Plus className="btn-icon" aria-hidden />
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
      <div className="card">
        <h2>Transações</h2>
        {rows.length === 0 ? (
          <div className="empty-state">
            <Inbox className="empty-state-icon" aria-hidden />
            <p className="empty-state-title">Nenhuma transação neste período</p>
            <p className="muted">
              Ajuste mês, conta ou tipo nos filtros — ou inclua um lançamento{' '}
              {view === 'transactions' ? 'no formulário ao lado' : 'no formulário acima'}.
            </p>
          </div>
        ) : (
          <ul className="list">
            {rows.map((t) => (
              <li key={t.id} className="item item-row-card">
                <div className="itemMain">
                  <div className="tx-card-amount-line">
                    {t.kind === 'opening_balance' ? (
                      <strong className="neutral">{signedFormatCents(t.amountCents)}</strong>
                    ) : t.type === 'transfer' ? (
                      <strong className="neutral">↔ {formatCents(t.amountCents)}</strong>
                    ) : (
                      <strong className={t.type === 'income' ? 'positive' : 'negative'}>
                        {t.type === 'income' ? '+' : '−'} {formatCents(t.amountCents)}
                      </strong>
                    )}
                  </div>
                  <div className="muted tx-card-detail">
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
                <div className="item-aside">
                  <span className="item-aside-meta muted">{formatISODateForDisplay(t.date)}</span>
                  <div className="itemActions">
                    <button
                      type="button"
                      className="ghost icon-btn"
                      onClick={() => setEditingId(t.id)}
                      aria-label="Editar transação"
                      title="Editar"
                    >
                      <Pencil aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="danger icon-btn"
                      onClick={() => void requestDeleteTransaction(t.id)}
                      aria-label="Excluir transação"
                      title="Excluir"
                    >
                      <Trash2 aria-hidden />
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
    <div className={`container${!online ? ' container--offline' : ''}`}>
      {!online ? (
        <div className="offline-bar" role="status">
          <WifiOff className="btn-icon" aria-hidden />
          <span>Você está offline. O app precisa de conexão para sincronizar com a nuvem.</span>
        </div>
      ) : null}
      <header className="header">
        <div>
          <h1>My Money Control</h1>
          <p className="muted">
            {usingCloud
              ? 'Dados na nuvem (Supabase). Requer conexão para alterações.'
              : isSupabaseConfigured()
                ? 'Dados neste aparelho (IndexedDB). Entre na nuvem para sincronizar entre dispositivos.'
                : 'Dados neste aparelho (IndexedDB). Opcional: variáveis VITE_SUPABASE_* para sync.'}
          </p>
        </div>
        <div className="header-aside">
          <div className="pill">
            {!authReady ? 'Sessão…' : ready ? (usingCloud ? 'Nuvem' : 'Local') : 'Carregando…'}
          </div>
          {isSupabaseConfigured() && authSession?.user ? (
            <div className="header-cloud" aria-label="Sessão na nuvem">
              <span className="header-cloud-email muted" title={authSession.user.email ?? undefined}>
                {authSession.user.email}
              </span>
              <div className="header-cloud-actions">
                <button
                  type="button"
                  className="btn-secondary icon-btn icon-btn--header"
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
                    <Loader2 className="btn-icon icon-spin" aria-hidden />
                  ) : (
                    <CloudUpload className="btn-icon" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className="btn-secondary icon-btn icon-btn--header"
                  onClick={() => void signOut()}
                  aria-label="Sair"
                  title="Sair"
                >
                  <LogOut className="btn-icon" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <nav className="top-nav" aria-label="Navegação principal">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'top-nav-link is-active' : 'top-nav-link')}>
          <LayoutDashboard className="top-nav-icon" aria-hidden />
          <span>Início</span>
        </NavLink>
        <NavLink
          to="/transactions"
          className={({ isActive }) => (isActive ? 'top-nav-link is-active' : 'top-nav-link')}
        >
          <Receipt className="top-nav-icon" aria-hidden />
          <span>Transações</span>
        </NavLink>
        <NavLink
          to="/accounts"
          className={({ isActive }) => (isActive ? 'top-nav-link is-active' : 'top-nav-link')}
        >
          <WalletCards className="top-nav-icon" aria-hidden />
          <span>Contas</span>
        </NavLink>
        <NavLink
          to="/categories"
          className={({ isActive }) => (isActive ? 'top-nav-link is-active' : 'top-nav-link')}
        >
          <Tags className="top-nav-icon" aria-hidden />
          <span>Categorias</span>
        </NavLink>
      </nav>

      {view !== 'home' ? (
        <h2 className="page-title">
          {view === 'transactions'
            ? 'Transações'
            : view === 'accounts'
              ? 'Contas'
              : 'Categorias'}
        </h2>
      ) : null}

      {notice ? (
        <div
          className="notice notice-error"
          role="alert"
          aria-live="polite"
        >
          <span className="notice-text">{notice.message}</span>
          <button
            type="button"
            className="notice-dismiss icon-btn"
            onClick={() => setNotice(null)}
            aria-label="Fechar aviso"
          >
            <X className="btn-icon" aria-hidden />
          </button>
        </div>
      ) : null}

      {view === 'categories' ? (
        <section className="grid single">
          <div className="card">
            <h2>Gerenciar categorias</h2>
            <p className="hint accounts-hint">
              Use categorias como &quot;Ajuste&quot; para alinhar faturas sem lançar tudo retroativamente. A
              categoria &quot;Transferência&quot; é reservada ao app. Não dá para excluir uma categoria que
              ainda tenha lançamentos — altere ou apague esses lançamentos antes.
            </p>
            <form
              className="form account-form"
              onSubmit={(e) => {
                void onAddCategory(e)
              }}
            >
              <label className="full">
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
              <div className="actions">
                <button
                  type="submit"
                  disabled={
                    submittingCategory ||
                    !categoryNewLabel.trim() ||
                    Boolean(categoriesInitError)
                  }
                  className="btn-with-icon"
                >
                  {submittingCategory ? (
                    <Loader2 className="btn-icon icon-spin" aria-hidden />
                  ) : (
                    <Plus className="btn-icon" aria-hidden />
                  )}
                  <span>{submittingCategory ? 'Salvando…' : 'Incluir'}</span>
                </button>
              </div>
            </form>

            {!catReady ? (
              <p className="muted">Carregando…</p>
            ) : categoriesInitError ? (
              <p className="muted">
                Lista indisponível até o Supabase estar correto. Use o aviso acima e &quot;Tentar
                novamente&quot;.
              </p>
            ) : categories.length === 0 ? (
              <p className="muted">Nenhuma categoria.</p>
            ) : (
              <ul className="list accounts-list">
                {categories.map((c) => (
                  <li key={c.id} className="item item-row-card">
                    <div className="itemMain">
                      {categoryEdit?.id === c.id ? (
                        <form
                          className="form account-form"
                          onSubmit={(e) => {
                            void onSaveCategoryEdit(e)
                          }}
                        >
                          <label className="full">
                            <span>Nome</span>
                            <input
                              value={categoryEdit.label}
                              onChange={(e) =>
                                setCategoryEdit((x) => (x ? { ...x, label: e.target.value } : x))
                              }
                              maxLength={80}
                            />
                          </label>
                          <div className="actions">
                            <button
                              type="button"
                              className="ghost btn-with-icon"
                              onClick={() => setCategoryEdit(null)}
                            >
                              <X className="btn-icon" aria-hidden />
                              <span>Voltar</span>
                            </button>
                            <button type="submit" disabled={submittingCategory} className="btn-with-icon">
                              {submittingCategory ? (
                                <Loader2 className="btn-icon icon-spin" aria-hidden />
                              ) : (
                                <Check className="btn-icon" aria-hidden />
                              )}
                              <span>{submittingCategory ? 'Salvando…' : 'Salvar'}</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="item-head">
                            <div className="item-head-main">
                              <strong>{c.label}</strong>
                              {c.system ? <span className="tag">Sistema</span> : null}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {categoryEdit?.id !== c.id ? (
                      <div className="item-aside">
                        <span className="item-aside-meta muted" title={c.id}>
                          {c.id}
                        </span>
                        {!c.system ? (
                          <div className="itemActions">
                            <button
                              type="button"
                              className="ghost icon-btn"
                              aria-label={`Editar ${c.label}`}
                              title="Editar"
                              onClick={() => setCategoryEdit({ id: c.id, label: c.label })}
                            >
                              <Pencil className="btn-icon" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="danger icon-btn"
                              aria-label={`Excluir ${c.label}`}
                              title="Excluir"
                              onClick={() => void onDeleteCategory(c.id)}
                            >
                              <Trash2 className="btn-icon" aria-hidden />
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
        <div className="notice notice-error" role="alert" aria-live="polite">
          <span className="notice-text">{categoriesInitError}</span>
          <button
            type="button"
            className="btn-secondary btn-with-icon"
            disabled={!catReady}
            onClick={() => void initCat()}
          >
            {!catReady ? <Loader2 className="btn-icon icon-spin" aria-hidden /> : null}
            <span>Tentar novamente</span>
          </button>
        </div>
      ) : null}

      {showTxFiltersSummary ? (
        <section className="grid">
          <div className="card sticky-filters-card">
            <h2>Filtros</h2>
            <p className="period-label muted">Período: {formatMonthYearForDisplay(month)}</p>
            <div className="row row-4">
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

          <div className="card">
            <h2>Resumo — {formatMonthYearForDisplay(month)}</h2>
            <div className="summary summary-4">
              <div>
                <div className="muted">Receitas</div>
                <div className="value">{formatCents(summary.income)}</div>
              </div>
              <div>
                <div className="muted">Despesas</div>
                <div className="value">{formatCents(summary.expense)}</div>
              </div>
              <div>
                <div className="muted">Resultado</div>
                <div className={summary.flow >= 0 ? 'value positive' : 'value negative'}>
                  {formatCents(summary.flow)}
                </div>
                <div className="hint">Receitas − despesas (sem saldo inicial nem transferências)</div>
              </div>
              <div>
                <div className="muted">Saldo no período</div>
                <div className={summary.period >= 0 ? 'value positive' : 'value negative'}>
                  {formatCents(summary.period)}
                </div>
                <div className="hint">Inclui saldo inicial e movimentos</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {showAccounts ? (
      <section className={showTxWorkspace ? 'grid' : 'grid single'}>
        <div className="card">
          <h2>Contas</h2>
          <p className="hint accounts-hint">
            Saldo por conta = histórico completo. Em cartões, &quot;A pagar&quot; usa sempre o{' '}
            <strong>mês civil atual</strong> (independente do filtro da lista).
          </p>
          <div className={accountEdit ? 'account-form-wrap is-disabled' : 'account-form-wrap'}>
            <form className="form account-form" onSubmit={onSubmitAccount}>
              <label className="full">
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
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={accountForm.makeDefault}
                  onChange={(e) => setAccountForm((f) => ({ ...f, makeDefault: e.target.checked }))}
                />
                <span>Definir como conta padrão</span>
              </label>
              <div className="actions">
                <button
                  type="submit"
                  disabled={!canSubmitAccount || submittingAccount}
                  className="btn-with-icon"
                >
                  {submittingAccount ? (
                    <Loader2 className="btn-icon icon-spin" aria-hidden />
                  ) : (
                    <Plus className="btn-icon" aria-hidden />
                  )}
                  <span>{submittingAccount ? 'Salvando…' : 'Incluir conta'}</span>
                </button>
              </div>
            </form>
          </div>

          {accountEdit ? (
            <form className="form account-form account-edit-form" onSubmit={onSubmitAccountEdit}>
              <h3 className="account-edit-title">Editar conta</h3>
              <p className="hint full">
                Ajuste nome, tipo ou saldo inicial. Deixe o saldo vazio para remover o lançamento de saldo
                inicial.
              </p>
              <label className="full">
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
              <div className="actions">
                <button
                  type="button"
                  className="ghost btn-with-icon"
                  onClick={() => setAccountEdit(null)}
                >
                  <X className="btn-icon" aria-hidden />
                  <span>Voltar</span>
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitAccountEdit || submittingAccountEdit}
                  className="btn-with-icon"
                >
                  {submittingAccountEdit ? (
                    <Loader2 className="btn-icon icon-spin" aria-hidden />
                  ) : (
                    <Check className="btn-icon" aria-hidden />
                  )}
                  <span>{submittingAccountEdit ? 'Salvando…' : 'Salvar'}</span>
                </button>
              </div>
            </form>
          ) : null}
          {accounts.length === 0 ? (
            <div className="empty-state">
              <WalletCards className="empty-state-icon" aria-hidden />
              <p className="empty-state-title">Nenhuma conta cadastrada</p>
              <p className="muted">
                Crie uma conta (banco, carteira ou cartão) no formulário acima para começar a lançar
                transações.
              </p>
            </div>
          ) : (
            <ul className="list accounts-list">
              {accounts.map((a: Account) => (
                <li
                  key={a.id}
                  className={
                    a.type === 'credit_card' ? 'item item-row-card item-row-card--tall' : 'item item-row-card'
                  }
                >
                  <div className="itemMain">
                    <div className="item-head">
                      <div className="item-head-main">
                        <strong>{a.name}</strong>
                        {a.isDefault ? <span className="tag">Padrão</span> : null}
                      </div>
                    </div>
                    {a.type === 'credit_card' ? (
                      <>
                        <div className="account-fatura-label muted">Fatura ({faturaMesLabel})</div>
                        <div className="account-payable-amount">
                          A pagar: {formatCents(creditCardPayableByAccountId[a.id] ?? 0)}
                        </div>
                        <div className="account-balance account-balance--subtle muted">
                          Saldo (contábil): {formatCents(balancesByAccountId[a.id] ?? 0)}
                        </div>
                        {payInvoice?.cardId === a.id ? (
                          <form className="pay-invoice-form" onSubmit={onSubmitPayInvoice}>
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
                            <div className="pay-invoice-actions">
                              <button
                                type="button"
                                className="ghost btn-with-icon"
                                onClick={() => setPayInvoice(null)}
                              >
                                <X className="btn-icon" aria-hidden />
                                <span>Voltar</span>
                              </button>
                              <button
                                type="submit"
                                disabled={!canSubmitPayInvoice || submittingPayInvoice}
                                className="btn-with-icon"
                              >
                                {submittingPayInvoice ? (
                                  <Loader2 className="btn-icon icon-spin" aria-hidden />
                                ) : (
                                  <Check className="btn-icon" aria-hidden />
                                )}
                                <span>{submittingPayInvoice ? 'Registrando…' : 'Registrar'}</span>
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            className="ghost pay-invoice-open btn-with-icon"
                            onClick={() => openPayInvoice(a.id)}
                          >
                            <CreditCard className="btn-icon" aria-hidden />
                            <span>Pagar fatura</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div
                        className={
                          (balancesByAccountId[a.id] ?? 0) >= 0
                            ? 'account-balance positive'
                            : 'account-balance negative'
                        }
                      >
                        Saldo: {formatCents(balancesByAccountId[a.id] ?? 0)}
                      </div>
                    )}
                  </div>
                  <div className="item-aside">
                    <span
                      className="item-aside-meta muted"
                      title={ACCOUNT_TYPE_LABEL[a.type]}
                    >
                      {ACCOUNT_TYPE_LABEL[a.type]}
                    </span>
                    <div className="itemActions">
                      <button
                        type="button"
                        className="ghost icon-btn"
                        onClick={() => {
                          void beginEditAccount(a)
                        }}
                        aria-label={`Editar conta ${a.name}`}
                        title="Editar"
                      >
                        <Pencil className="btn-icon" aria-hidden />
                      </button>
                      {!a.isDefault ? (
                        <button
                          type="button"
                          className="ghost icon-btn"
                          onClick={() => void handleSetDefaultAccount(a.id)}
                          aria-label="Definir como conta padrão"
                          title="Conta padrão"
                        >
                          <Star className="btn-icon" aria-hidden />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="danger icon-btn"
                        disabled={accounts.length <= 1}
                        onClick={() => void requestArchiveAccount(a.id, a.name)}
                        aria-label={`Arquivar conta ${a.name}`}
                        title="Arquivar"
                      >
                        <Archive className="btn-icon" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {archivedAccounts.length > 0 ? (
            <details className="archived-accounts">
              <summary>
                Contas arquivadas <span className="muted">({archivedAccounts.length})</span>
              </summary>
              <ul className="list accounts-list">
                {archivedAccounts.map((a: Account) => (
                  <li
                    key={a.id}
                    className={
                      a.type === 'credit_card'
                        ? 'item item-archived item-row-card item-row-card--tall'
                        : 'item item-archived item-row-card'
                    }
                  >
                    <div className="itemMain">
                      <div className="item-head">
                        <div className="item-head-main">
                          <strong>{a.name}</strong>
                          {a.isDefault ? <span className="tag">Padrão</span> : null}
                        </div>
                      </div>
                      {a.type === 'credit_card' ? (
                        <>
                          <div className="account-fatura-label muted">Fatura ({faturaMesLabel})</div>
                          <div className="account-payable-amount account-balance--compact">
                            A pagar: {formatCents(creditCardPayableByAccountId[a.id] ?? 0)}
                          </div>
                          <div className="account-balance account-balance--subtle muted account-balance--compact">
                            Saldo (contábil): {formatCents(balancesByAccountId[a.id] ?? 0)}
                          </div>
                        </>
                      ) : (
                        <div
                          className={
                            (balancesByAccountId[a.id] ?? 0) >= 0
                              ? 'account-balance account-balance--compact positive'
                              : 'account-balance account-balance--compact negative'
                          }
                        >
                          Saldo: {formatCents(balancesByAccountId[a.id] ?? 0)}
                        </div>
                      )}
                    </div>
                    <div className="item-aside">
                      <span
                        className="item-aside-meta muted"
                        title={ACCOUNT_TYPE_LABEL[a.type]}
                      >
                        {ACCOUNT_TYPE_LABEL[a.type]}
                      </span>
                      <div className="itemActions">
                        <button
                          type="button"
                          className="ghost icon-btn"
                          onClick={() => {
                            void beginEditAccount(a)
                          }}
                          aria-label={`Editar conta ${a.name}`}
                          title="Editar"
                        >
                          <Pencil className="btn-icon" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="ghost icon-btn"
                          onClick={() => void handleUnarchiveAccount(a.id)}
                          aria-label={`Restaurar conta ${a.name}`}
                          title="Restaurar"
                        >
                          <Undo2 className="btn-icon" aria-hidden />
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
        <section className="grid">
          {renderTransactionFormCard()}
          {renderTransactionListCard()}
        </section>
      ) : null}

      {showAccounts && showTxWorkspace ? (
        <section className="grid single">{renderTransactionListCard()}</section>
      ) : null}

      {toast ? (
        <div className="toast-stack" role="status" aria-live="polite">
          <div className={`toast toast-${toast.variant}`}>{toast.message}</div>
        </div>
      ) : null}

      {showScrollTop ? (
        <button
          type="button"
          className="scroll-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo"
          title="Topo"
          style={showPwaInstallChrome ? { bottom: '5.75rem' } : undefined}
        >
          <ArrowUp className="btn-icon" aria-hidden />
        </button>
      ) : null}

      {showPwaInstallChrome ? (
        <div className="pwa-install-bar" role="region" aria-label="Instalar aplicativo">
          <p>Adicione à tela inicial para abrir mais rápido, como um app.</p>
          <div className="pwa-install-actions">
            <button type="button" className="ghost btn-with-icon" onClick={dismissPwaInstall}>
              <X className="btn-icon" aria-hidden />
              <span>Agora não</span>
            </button>
            <button type="button" className="btn-with-icon" onClick={() => void onPwaInstallClick()}>
              <Download className="btn-icon" aria-hidden />
              <span>Instalar</span>
            </button>
          </div>
        </div>
      ) : null}

      {confirmDialog ? (
        <div
          className="modal-root"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismissConfirmDialog()
          }}
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmDescId}
            onKeyDown={onConfirmDialogKeyDown}
          >
            <h2 id={confirmTitleId} className="modal-title">
              {confirmDialog.kind === 'delete-transaction'
                ? 'Excluir transação?'
                : 'Arquivar conta?'}
            </h2>
            <p id={confirmDescId} className="modal-desc">
              {confirmDialog.kind === 'delete-transaction'
                ? 'Esta ação não pode ser desfeita. A transação será removida permanentemente.'
                : `Arquivar a conta “${confirmDialog.displayName}”? Você pode restaurá-la depois em contas arquivadas.`}
            </p>
            <div className="modal-actions">
              <button
                ref={confirmCancelRef}
                type="button"
                className="ghost btn-with-icon"
                onClick={dismissConfirmDialog}
              >
                <X className="btn-icon" aria-hidden />
                <span>Voltar</span>
              </button>
              <button
                type="button"
                className={
                  confirmDialog.kind === 'delete-transaction'
                    ? 'danger btn-with-icon'
                    : 'btn-with-icon'
                }
                onClick={() => void handleConfirmDialogPrimary()}
              >
                {confirmDialog.kind === 'delete-transaction' ? (
                  <Trash2 className="btn-icon" aria-hidden />
                ) : (
                  <Archive className="btn-icon" aria-hidden />
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

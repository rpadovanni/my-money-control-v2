import './App.css'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  currentMonthYYYYMM,
  formatISODateForDisplay,
  formatMonthYearForDisplay,
  todayISODate,
} from './shared/lib/dates'
import { summaryPeriodDelta } from './shared/lib/transaction-net'
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

function App() {
  const txReady = useStore((s) => s.transactions.ready)
  const accReady = useStore((s) => s.accounts.ready)
  const ready = txReady && accReady

  const month = useStore((s) => s.transactions.filters.month)
  const typeFilter = useStore((s) => s.transactions.filters.type)
  const categoryFilter = useStore((s) => s.transactions.filters.category)
  const accountFilter = useStore((s) => s.transactions.filters.accountId)

  const categories = useStore((s) => s.transactions.categories)
  const rows = useStore((s) => s.transactions.items)
  const accounts = useStore((s) => s.accounts.items)
  const archivedAccounts = useStore((s) => s.accounts.archivedItems)
  const balancesByAccountId = useStore((s) => s.accounts.balancesByAccountId)
  const creditCardPayableByAccountId = useStore((s) => s.accounts.creditCardPayableByAccountId)

  const initTx = useStore((s) => s.transactionsInit)
  const initAcc = useStore((s) => s.accountsInit)
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

  const [notice, setNotice] = useState<null | { variant: 'error' | 'success'; message: string }>(null)
  const [submittingTx, setSubmittingTx] = useState(false)
  const [submittingAccount, setSubmittingAccount] = useState(false)
  const [submittingAccountEdit, setSubmittingAccountEdit] = useState(false)
  const [submittingPayInvoice, setSubmittingPayInvoice] = useState(false)
  const payInvoiceAmountRef = useRef<HTMLInputElement>(null)

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
    if (notice?.variant !== 'success') return
    const t = window.setTimeout(() => setNotice(null), 3800)
    return () => window.clearTimeout(t)
  }, [notice])

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

  useEffect(() => {
    void initAcc()
    void initTx({ month: currentMonthYYYYMM() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        setNotice({ variant: 'success', message: 'Saldo inicial atualizado.' })
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
          setNotice({ variant: 'success', message: 'Transferência atualizada.' })
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
          setNotice({ variant: 'success', message: 'Transferência registrada.' })
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
        return
      }

      const amountCents = Math.round(amountNum * 100)
      if (amountCents <= 0) return

      const accountId = form.accountId || defaultAccountId
      if (!accountId) {
        setNotice({ variant: 'error', message: 'Selecione uma conta.' })
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
        setNotice({ variant: 'success', message: 'Transação atualizada.' })
      } else {
        await add({
          type: form.type,
          accountId,
          amountCents,
          date: form.date,
          category: form.category,
          description: desc,
        })
        setNotice({ variant: 'success', message: 'Transação adicionada.' })
      }

      setForm((f) => ({ ...f, amount: '', description: '', date: todayISODate() }))
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
      setNotice({ variant: 'success', message: 'Conta criada.' })
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
          setNotice({ variant: 'error', message: 'Saldo inicial inválido.' })
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
      setNotice({ variant: 'success', message: 'Conta atualizada.' })
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
      setNotice({ variant: 'success', message: 'Transação excluída.' })
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
      setNotice({ variant: 'success', message: 'Conta arquivada.' })
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
      setNotice({ variant: 'success', message: 'Conta padrão atualizada.' })
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    }
  }

  async function handleUnarchiveAccount(id: string) {
    setNotice(null)
    try {
      await unarchiveAccount(id)
      setNotice({ variant: 'success', message: 'Conta restaurada.' })
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
        setNotice({ variant: 'error', message: 'Escolha outra conta para debitar o pagamento.' })
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
      setNotice({ variant: 'success', message: 'Pagamento de fatura registrado.' })
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setSubmittingPayInvoice(false)
    }
  }

  const faturaMesLabel = formatMonthYearForDisplay(currentMonthYYYYMM())

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>My Money Control</h1>
          <p className="muted">Offline-first. Transações locais (IndexedDB).</p>
        </div>
        <div className="pill">{ready ? 'Pronto' : 'Carregando...'}</div>
      </header>

      {notice ? (
        <div
          className={`notice notice-${notice.variant}`}
          role={notice.variant === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <span className="notice-text">{notice.message}</span>
          <button
            type="button"
            className="notice-dismiss"
            onClick={() => setNotice(null)}
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      ) : null}

      <section className="grid">
        <div className="card">
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

      <section className="grid">
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
                  placeholder="ex.: Bradesco"
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
                <button type="submit" disabled={!canSubmitAccount || submittingAccount}>
                  {submittingAccount ? 'Salvando…' : 'Adicionar conta'}
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
                <button type="button" className="ghost" onClick={() => setAccountEdit(null)}>
                  Cancelar
                </button>
                <button type="submit" disabled={!canSubmitAccountEdit || submittingAccountEdit}>
                  {submittingAccountEdit ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          ) : null}
          {accounts.length === 0 ? (
            <p className="muted">
              Nenhuma conta ainda. Cadastre uma acima (banco, carteira ou cartão) para começar a lançar
              transações.
            </p>
          ) : (
            <ul className="list accounts-list">
              {accounts.map((a: Account) => (
                <li key={a.id} className="item">
                  <div className="itemMain">
                    <div className="itemTop">
                      <strong>{a.name}</strong>
                      <span className="muted">{ACCOUNT_TYPE_LABEL[a.type]}</span>
                    </div>
                    {a.isDefault ? <div className="tag">Padrão</div> : null}
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
                              <button type="button" className="ghost" onClick={() => setPayInvoice(null)}>
                                Cancelar
                              </button>
                              <button type="submit" disabled={!canSubmitPayInvoice || submittingPayInvoice}>
                                {submittingPayInvoice ? 'Registrando…' : 'Registrar pagamento'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            className="ghost pay-invoice-open"
                            onClick={() => openPayInvoice(a.id)}
                          >
                            Pagar fatura
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
                  <div className="itemActions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        void beginEditAccount(a)
                      }}
                    >
                      Editar
                    </button>
                    {!a.isDefault ? (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => void handleSetDefaultAccount(a.id)}
                      >
                        Padrão
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="danger"
                      disabled={accounts.length <= 1}
                      onClick={() => void requestArchiveAccount(a.id, a.name)}
                    >
                      Arquivar
                    </button>
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
                  <li key={a.id} className="item item-archived">
                    <div className="itemMain">
                      <div className="itemTop">
                        <strong>{a.name}</strong>
                        <span className="muted">{ACCOUNT_TYPE_LABEL[a.type]}</span>
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
                    <div className="itemActions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          void beginEditAccount(a)
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => void handleUnarchiveAccount(a.id)}
                      >
                        Restaurar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

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
                inputMode="decimal"
                placeholder={editing?.kind === 'opening_balance' ? 'pode ser negativo' : 'ex.: 25,90'}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(',', '.') }))}
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
                    {categories.map((c) => (
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
                  <button type="button" className="ghost" onClick={() => setEditingId(null)}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={!canSubmit || submittingTx}>
                    {submittingTx ? 'Salvando…' : 'Salvar'}
                  </button>
                </>
              ) : (
                <button type="submit" disabled={!canSubmit || submittingTx}>
                  {submittingTx ? 'Salvando…' : 'Adicionar'}
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="grid single">
        <div className="card">
          <h2>Transações</h2>
          {rows.length === 0 ? (
            <p className="muted">
              Nenhuma transação com os filtros atuais. Ajuste mês, conta ou tipo — ou cadastre uma nova
              transação ao lado.
            </p>
          ) : (
            <ul className="list">
              {rows.map((t) => (
                <li key={t.id} className="item">
                  <div className="itemMain">
                    <div className="itemTop">
                      {t.kind === 'opening_balance' ? (
                        <strong className="neutral">{signedFormatCents(t.amountCents)}</strong>
                      ) : t.type === 'transfer' ? (
                        <strong className="neutral">↔ {formatCents(t.amountCents)}</strong>
                      ) : (
                        <strong className={t.type === 'income' ? 'positive' : 'negative'}>
                          {t.type === 'income' ? '+' : '−'} {formatCents(t.amountCents)}
                        </strong>
                      )}
                      <span className="muted">{formatISODateForDisplay(t.date)}</span>
                    </div>
                    <div className="muted">
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
                  <div className="itemActions">
                    <button type="button" className="ghost" onClick={() => setEditingId(t.id)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => void requestDeleteTransaction(t.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

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
              <button ref={confirmCancelRef} type="button" className="ghost" onClick={dismissConfirmDialog}>
                Cancelar
              </button>
              <button
                type="button"
                className={confirmDialog.kind === 'delete-transaction' ? 'danger' : undefined}
                onClick={() => void handleConfirmDialogPrimary()}
              >
                {confirmDialog.kind === 'delete-transaction' ? 'Excluir' : 'Arquivar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App

import './App.css'
import { useEffect, useMemo, useState } from 'react'
import {
  currentMonthYYYYMM,
  formatISODateForDisplay,
  formatMonthYearForDisplay,
  todayISODate,
} from './shared/lib/dates'
import { transactionNetCents } from './shared/lib/transaction-net'
import { useStore } from './shared/store'
import type { Account, AccountType } from './shared/store/types/accounts'
import type { TransactionType } from './shared/store/types/transactions'

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  bank: 'Banco',
  wallet: 'Carteira',
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
        amount: String(editing.amountCents / 100),
        date: editing.date,
        category: editing.category,
        description: editing.description ?? '',
      })
      return
    }
    setForm({
      type: editing.type,
      accountId: editing.accountId,
      amount: String(editing.amountCents / 100),
      date: editing.date,
      category: editing.category,
      description: editing.description ?? '',
    })
  }, [editing])

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    let period = 0
    for (const t of rows) {
      period += transactionNetCents(t)
      if (t.kind !== 'normal') continue
      if (t.type === 'income') income += t.amountCents
      else expense += t.amountCents
    }
    return { income, expense, flow: income - expense, period }
  }, [rows])

  const canSubmit = form.amount.trim().length > 0 && Number.isFinite(Number(form.amount))
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
    if (!canSubmit) return

    if (editing?.kind === 'opening_balance') {
      const amountCents = Math.round(Number(form.amount) * 100)
      if (amountCents === 0) return
      await update(editing.id, {
        amountCents,
        date: form.date,
        description: form.description.trim() || undefined,
      })
      setEditingId(null)
      setForm((f) => ({ ...f, amount: '', description: '', date: todayISODate() }))
      return
    }

    const amountCents = Math.round(Number(form.amount) * 100)
    if (amountCents <= 0) return

    const accountId = form.accountId || defaultAccountId
    if (!accountId) return

    if (editing) {
      await update(editing.id, {
        type: form.type,
        accountId,
        amountCents,
        date: form.date,
        category: form.category,
        description: form.description.trim() || undefined,
      })
      setEditingId(null)
    } else {
      await add({
        type: form.type,
        accountId,
        amountCents,
        date: form.date,
        category: form.category,
        description: form.description.trim() || undefined,
      })
    }

    setForm((f) => ({ ...f, amount: '', description: '', date: todayISODate() }))
  }

  async function onSubmitAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitAccount || accountEdit) return

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
  }

  async function beginEditAccount(a: Account) {
    const snap = await getAccountOpeningForEdit(a.id)
    setAccountEdit({
      id: a.id,
      name: a.name,
      type: a.type,
      openingBalance: snap.amountCents != null ? String(snap.amountCents / 100) : '',
      openingDate: snap.date,
    })
  }

  async function onSubmitAccountEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitAccountEdit || !accountEdit) return

    const raw = accountEdit.openingBalance.trim().replace(',', '.')
    let openingBalanceCents: number | null = null
    if (raw.length > 0) {
      if (!Number.isFinite(Number(raw))) return
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
  }

  function accountName(id: string) {
    return (
      accounts.find((a) => a.id === id)?.name ?? archivedAccounts.find((a) => a.id === id)?.name ?? id
    )
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>My Money Control</h1>
          <p className="muted">Offline-first. Transações locais (IndexedDB).</p>
        </div>
        <div className="pill">{ready ? 'Pronto' : 'Carregando...'}</div>
      </header>

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
              <div className="hint">Receitas − despesas (sem saldo inicial)</div>
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
          <p className="hint accounts-hint">Saldo por conta = todo o histórico de movimentos (não só o mês filtrado).</p>
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
                <button type="submit" disabled={!canSubmitAccount}>
                  Adicionar conta
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
                <button type="submit" disabled={!canSubmitAccountEdit}>
                  Salvar
                </button>
              </div>
            </form>
          ) : null}
          {accounts.length === 0 ? (
            <p className="muted">Nenhuma conta.</p>
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
                    <div
                      className={
                        (balancesByAccountId[a.id] ?? 0) >= 0 ? 'account-balance positive' : 'account-balance negative'
                      }
                    >
                      Saldo: {formatCents(balancesByAccountId[a.id] ?? 0)}
                    </div>
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
                      <button type="button" className="ghost" onClick={() => void setDefaultAccount(a.id)}>
                        Padrão
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="danger"
                      disabled={accounts.length <= 1}
                      onClick={() => void archiveAccount(a.id)}
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
                      <div
                        className={
                          (balancesByAccountId[a.id] ?? 0) >= 0
                            ? 'account-balance account-balance--compact positive'
                            : 'account-balance account-balance--compact negative'
                        }
                      >
                        Saldo: {formatCents(balancesByAccountId[a.id] ?? 0)}
                      </div>
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
                      <button type="button" className="ghost" onClick={() => void unarchiveAccount(a.id)}>
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
          <h2>{editing ? (editing.kind === 'opening_balance' ? 'Saldo inicial' : 'Editar transação') : 'Nova transação'}</h2>
          <form className="form" onSubmit={onSubmit}>
            {editing?.kind !== 'opening_balance' ? (
              <label>
                <span>Tipo</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TransactionType }))}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
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

            {editing?.kind !== 'opening_balance' ? (
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
            ) : (
              <label className="full">
                <span>Conta</span>
                <input readOnly value={accountName(editing.accountId)} />
              </label>
            )}

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
                  <button type="submit" disabled={!canSubmit}>
                    Salvar
                  </button>
                </>
              ) : (
                <button type="submit" disabled={!canSubmit}>
                  Adicionar
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
            <p className="muted">Sem transações para este filtro.</p>
          ) : (
            <ul className="list">
              {rows.map((t) => (
                <li key={t.id} className="item">
                  <div className="itemMain">
                    <div className="itemTop">
                      {t.kind === 'opening_balance' ? (
                        <strong className="neutral">{signedFormatCents(t.amountCents)}</strong>
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
                      ) : (
                        <>
                          {categories.find((c) => c.id === t.category)?.label ?? t.category} • {accountName(t.accountId)}
                          {t.description ? ` • ${t.description}` : ''}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="itemActions">
                    <button type="button" className="ghost" onClick={() => setEditingId(t.id)}>
                      Editar
                    </button>
                    <button type="button" className="danger" onClick={() => void remove(t.id)}>
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

export default App

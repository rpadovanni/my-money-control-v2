import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { useStore } from './shared/store'
import type { TransactionType } from './shared/store/types/transactions'

function formatCents(cents: number) {
  const value = cents / 100
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function currentMonthISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function App() {
  const ready = useStore((s) => s.transactions.ready)
  const month = useStore((s) => s.transactions.filters.month)
  const typeFilter = useStore((s) => s.transactions.filters.type)
  const categoryFilter = useStore((s) => s.transactions.filters.category)

  const categories = useStore((s) => s.transactions.categories)
  const rows = useStore((s) => s.transactions.items)

  const init = useStore((s) => s.transactionsInit)
  const setMonth = useStore((s) => s.setTransactionsMonth)
  const setTypeFilter = useStore((s) => s.setTransactionsType)
  const setCategoryFilter = useStore((s) => s.setTransactionsCategory)

  const add = useStore((s) => s.addTransaction)
  const update = useStore((s) => s.updateTransaction)
  const remove = useStore((s) => s.deleteTransaction)

  const [editingId, setEditingId] = useState<string | null>(null)

  const editing = useMemo(
    () => rows.find((t) => t.id === editingId) ?? null,
    [editingId, rows],
  )

  const [form, setForm] = useState(() => ({
    type: 'expense' as TransactionType,
    amount: '',
    date: todayISO(),
    category: 'other' as string,
    description: '',
  }))

  useEffect(() => {
    init({ month: currentMonthISO() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!editing) return
    setForm({
      type: editing.type,
      amount: String(editing.amountCents / 100),
      date: editing.date,
      category: editing.category,
      description: editing.description ?? '',
    })
  }, [editing])

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of rows) {
      if (t.type === 'income') income += t.amountCents
      else expense += t.amountCents
    }
    return { income, expense, balance: income - expense }
  }, [rows])

  const canSubmit = form.amount.trim().length > 0 && Number.isFinite(Number(form.amount))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const amountCents = Math.round(Number(form.amount) * 100)
    if (amountCents <= 0) return

    if (editing) {
      await update(editing.id, {
        type: form.type,
        amountCents,
        date: form.date,
        category: form.category,
        description: form.description.trim() || undefined,
      })
      setEditingId(null)
    } else {
      await add({
        type: form.type,
        amountCents,
        date: form.date,
        category: form.category,
        description: form.description.trim() || undefined,
      })
    }

    setForm((f) => ({ ...f, amount: '', description: '', date: todayISO() }))
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
          <div className="row">
            <label>
              <span>Mês</span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
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
                onChange={(e) =>
                  setCategoryFilter(e.target.value === 'all' ? null : e.target.value)
                }
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
          <h2>Resumo do mês</h2>
          <div className="summary">
            <div>
              <div className="muted">Receitas</div>
              <div className="value">{formatCents(summary.income)}</div>
            </div>
            <div>
              <div className="muted">Despesas</div>
              <div className="value">{formatCents(summary.expense)}</div>
            </div>
            <div>
              <div className="muted">Saldo</div>
              <div className={summary.balance >= 0 ? 'value positive' : 'value negative'}>
                {formatCents(summary.balance)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>{editing ? 'Editar transação' : 'Nova transação'}</h2>
          <form className="form" onSubmit={onSubmit}>
            <label>
              <span>Tipo</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as TransactionType }))
                }
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </label>

            <label>
              <span>Valor (R$)</span>
              <input
                inputMode="decimal"
                placeholder="ex.: 25,90"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value.replace(',', '.') }))
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
                      <strong className={t.type === 'income' ? 'positive' : 'negative'}>
                        {t.type === 'income' ? '+' : '-'} {formatCents(t.amountCents)}
                      </strong>
                      <span className="muted">{t.date}</span>
                    </div>
                    <div className="muted">
                      {categories.find((c) => c.id === t.category)?.label ?? t.category}
                      {t.description ? ` • ${t.description}` : ''}
                    </div>
                  </div>
                  <div className="itemActions">
                    <button className="ghost" onClick={() => setEditingId(t.id)}>
                      Editar
                    </button>
                    <button className="danger" onClick={() => void remove(t.id)}>
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

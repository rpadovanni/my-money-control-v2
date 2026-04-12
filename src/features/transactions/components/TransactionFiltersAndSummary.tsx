import { useMemo } from 'react'
import { formatMonthYearForDisplay } from '../../../shared/lib/dates'
import { summaryPeriodDelta } from '../utils/transaction-net'
import { ui } from '../../../shared/styles/dashboard-ui'
import { formatCents } from '../../../shared/utils/money-format'
import { useTransactionsStore } from '../store/transactions.store'
import type { TransactionType } from '../types/transactions'

export type TxFilterAccountOption = { id: string; name: string; isDefault: boolean }
export type TxFilterCategoryOption = { id: string; label: string }

export function TransactionFiltersAndSummary({
  accounts,
  categories,
}: {
  accounts: TxFilterAccountOption[]
  categories: TxFilterCategoryOption[]
}) {
  const month = useTransactionsStore((s) => s.transactions.filters.month)
  const typeFilter = useTransactionsStore((s) => s.transactions.filters.type)
  const categoryFilter = useTransactionsStore((s) => s.transactions.filters.category)
  const accountFilter = useTransactionsStore((s) => s.transactions.filters.accountId)
  const rows = useTransactionsStore((s) => s.transactions.items)
  const setMonth = useTransactionsStore((s) => s.setTransactionsMonth)
  const setTypeFilter = useTransactionsStore((s) => s.setTransactionsType)
  const setCategoryFilter = useTransactionsStore((s) => s.setTransactionsCategory)
  const setAccountFilter = useTransactionsStore((s) => s.setTransactionsAccount)

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

  return (
    <section className={ui.grid}>
      <div className={ui.stickyFilters}>
        <h2 className={ui.cardTitle}>Filtros</h2>
        <p className={ui.periodLabel}>Período: {formatMonthYearForDisplay(month)}</p>
        <div className={ui.row4}>
          <label>
            <span>Mês</span>
            <input type="month" value={month} onChange={(e) => void setMonth(e.target.value)} />
          </label>

          <label>
            <span>Conta</span>
            <select
              value={accountFilter}
              onChange={(e) => void setAccountFilter(e.target.value as typeof accountFilter)}
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
              onChange={(e) => void setTypeFilter(e.target.value as 'all' | TransactionType)}
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
              onChange={(e) =>
                void setCategoryFilter(e.target.value === 'all' ? null : e.target.value)
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
  )
}

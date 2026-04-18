import { useMemo } from "react";
import { formatMonthYearForDisplay } from "../../../shared/lib/dates";
import { summaryPeriodDelta } from "../utils/transaction-net";
import { Input } from "../../../shared/components/ui/Input";
import { Select } from "../../../shared/components/ui/Select";
import { formatCents } from "../../../shared/utils/money-format";
import { useTransactionsStore } from "../store/transactions.store";
import type { TransactionType } from "../types/transactions";

export type TxFilterAccountOption = {
  id: string;
  name: string;
  isDefault: boolean;
};
export type TxFilterCategoryOption = { id: string; label: string };

export function TransactionFiltersAndSummary({
  accounts,
  categories,
}: {
  accounts: TxFilterAccountOption[];
  categories: TxFilterCategoryOption[];
}) {
  const month = useTransactionsStore((s) => s.transactions.filters.month);
  const typeFilter = useTransactionsStore((s) => s.transactions.filters.type);
  const categoryFilter = useTransactionsStore(
    (s) => s.transactions.filters.category,
  );
  const accountFilter = useTransactionsStore(
    (s) => s.transactions.filters.accountId,
  );
  const rows = useTransactionsStore((s) => s.transactions.items);
  const setMonth = useTransactionsStore((s) => s.setTransactionsMonth);
  const setTypeFilter = useTransactionsStore((s) => s.setTransactionsType);
  const setCategoryFilter = useTransactionsStore(
    (s) => s.setTransactionsCategory,
  );
  const setAccountFilter = useTransactionsStore(
    (s) => s.setTransactionsAccount,
  );

  const summaryAccountKey = accountFilter === "all" ? "all" : accountFilter;

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let period = 0;
    for (const t of rows) {
      period += summaryPeriodDelta(t, summaryAccountKey);
      if (t.kind !== "normal") continue;
      if (t.type === "transfer") continue;
      if (t.type === "income") income += t.amountCents;
      else expense += t.amountCents;
    }
    return { income, expense, flow: income - expense, period };
  }, [rows, summaryAccountKey]);

  return (
    <section className="mt-4 grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body">
          <h2 className="card-title">Filtros</h2>
          <p className="text-sm text-base-content/70">
            Período: {formatMonthYearForDisplay(month)}
          </p>
          <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[960px]:grid-cols-4">
            <Input
              label="Mês"
              type="month"
              value={month}
              onChange={(e) => void setMonth(e.target.value)}
            />

            <Select
              label="Conta"
              value={accountFilter}
              onChange={(e) =>
                void setAccountFilter(e.target.value as typeof accountFilter)
              }
            >
              <option value="all">Todas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.isDefault ? " (padrão)" : ""}
                </option>
              ))}
            </Select>

            <Select
              label="Tipo"
              value={typeFilter}
              onChange={(e) =>
                void setTypeFilter(e.target.value as "all" | TransactionType)
              }
            >
              <option value="all">Todos</option>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
              <option value="transfer">Transferência</option>
            </Select>

            <Select
              label="Categoria"
              value={categoryFilter ?? "all"}
              onChange={(e) =>
                void setCategoryFilter(
                  e.target.value === "all" ? null : e.target.value,
                )
              }
            >
              <option value="all">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="card border border-base-300 bg-base-100">
        <div className="card-body">
          <h2 className="card-title">
            Resumo — {formatMonthYearForDisplay(month)}
          </h2>
          <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-4">
            <div>
              <div className="text-base-content/70">Receitas</div>
              <div className="mt-1 font-bold">
                {formatCents(summary.income)}
              </div>
            </div>
            <div>
              <div className="text-base-content/70">Despesas</div>
              <div className="mt-1 font-bold">
                {formatCents(summary.expense)}
              </div>
            </div>
            <div>
              <div className="text-base-content/70">Resultado</div>
              <div
                className={`mt-1 font-bold ${summary.flow >= 0 ? "text-success" : "text-error"}`}
              >
                {formatCents(summary.flow)}
              </div>
              <div className="text-xs text-base-content/60">
                Receitas − despesas (sem saldo inicial nem transferências)
              </div>
            </div>
            <div>
              <div className="text-base-content/70">Saldo no período</div>
              <div
                className={`mt-1 font-bold ${summary.period >= 0 ? "text-success" : "text-error"}`}
              >
                {formatCents(summary.period)}
              </div>
              <div className="text-xs text-base-content/60">
                Inclui saldo inicial e movimentos
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

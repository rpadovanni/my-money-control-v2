/**
 * View-model dos KPIs da Home: receitas/despesas do mês actualmente filtrado
 * em `transactions.store`, saldo agregado das contas activas e total das
 * facturas em aberto dos cartões.
 *
 * Decisões:
 * - **Mês:** segue o filtro do `transactions.store` (mesmo critério que a lista
 *   «Transações Recentes»), para não divergir entre cartões e tabela.
 * - **Receitas / Despesas:** ignora `kind !== 'normal'` (saldo inicial) e
 *   `type === 'transfer'`, espelhando `TransactionFiltersAndSummary`.
 * - **Saldo:** soma dos saldos das contas **não arquivadas** — `balancesByAccountId`
 *   inclui apenas chaves para contas que tiveram movimentos, mas pode reter ids
 *   de contas arquivadas; intersectamos com `accounts.items`.
 * - **Fatura:** soma de `creditCardPayableByAccountId` para contas activas do
 *   tipo `credit_card`. **Não** modelamos limite/vencimento — exibimos só o
 *   total e o nº de cartões.
 */
import { useMemo } from "react";
import { useAccountsStore } from "../../features/accounts/store/accounts.store";
import { useTransactionsStore } from "../../features/transactions/store/transactions.store";
import { formatMonthYearForDisplay } from "../../shared/lib/dates";

export type DashboardHomeMetrics = {
  monthLabel: string;
  income: { cents: number; count: number };
  expense: { cents: number; count: number };
  balance: { cents: number; accountsCount: number };
  invoice: { cents: number; cardsCount: number };
  ready: boolean;
};

export function useDashboardHomeMetrics(): DashboardHomeMetrics {
  const month = useTransactionsStore((s) => s.transactions.filters.month);
  const txItems = useTransactionsStore((s) => s.transactions.items);
  const txReady = useTransactionsStore((s) => s.transactions.ready);

  const accounts = useAccountsStore((s) => s.accounts.items);
  const balancesByAccountId = useAccountsStore(
    (s) => s.accounts.balancesByAccountId,
  );
  const creditCardPayableByAccountId = useAccountsStore(
    (s) => s.accounts.creditCardPayableByAccountId,
  );
  const accReady = useAccountsStore((s) => s.accounts.ready);

  const periodTotals = useMemo(() => {
    let incomeCents = 0;
    let incomeCount = 0;
    let expenseCents = 0;
    let expenseCount = 0;

    for (const t of txItems) {
      if (t.kind !== "normal") continue;
      if (t.type === "transfer") continue;
      if (t.type === "income") {
        incomeCents += t.amountCents;
        incomeCount += 1;
      } else if (t.type === "expense") {
        expenseCents += t.amountCents;
        expenseCount += 1;
      }
    }

    return { incomeCents, incomeCount, expenseCents, expenseCount };
  }, [txItems]);

  const balance = useMemo(() => {
    let cents = 0;
    for (const acc of accounts) {
      cents += balancesByAccountId[acc.id] ?? 0;
    }
    return { cents, accountsCount: accounts.length };
  }, [accounts, balancesByAccountId]);

  const invoice = useMemo(() => {
    let cents = 0;
    let cardsCount = 0;
    for (const acc of accounts) {
      if (acc.type !== "credit_card") continue;
      cardsCount += 1;
      cents += creditCardPayableByAccountId[acc.id] ?? 0;
    }
    return { cents, cardsCount };
  }, [accounts, creditCardPayableByAccountId]);

  return {
    monthLabel: formatMonthYearForDisplay(month),
    income: {
      cents: periodTotals.incomeCents,
      count: periodTotals.incomeCount,
    },
    expense: {
      cents: periodTotals.expenseCents,
      count: periodTotals.expenseCount,
    },
    balance,
    invoice,
    ready: txReady && accReady,
  };
}

import { useMemo } from "react";
import { Equal, TrendingDown, TrendingUp } from "lucide-react";
import { SummaryMetricCard } from "../../../shared/components/ui/SummaryMetricCard";
import {
  currentMonthYYYYMM,
  formatISODateForDisplay,
  formatMonthYearForDisplay,
  monthDayBounds,
} from "../../../shared/lib/dates";
import { summaryPeriodDelta } from "../utils/transaction-net";
import { formatCents } from "../../../shared/utils/money-format";
import { useTransactionsStore } from "../store/transactions.store";
import type { TransactionsPeriod } from "../types/transactions";

/**
 * Resumo do conjunto de transações actualmente filtrado: receitas, despesas,
 * resultado e saldo no período.
 *
 * Quando não há filtro de período (`period.kind === 'all'`), o resumo
 * fica sempre no **mês civil corrente** — assim os números permanecem
 * estáveis e relevantes mesmo com a lista mostrando tudo. Para isso o
 * componente reaplica os limites do mês corrente ao agregar (a lista do
 * store contém todas as transações neste caso).
 *
 * Agregação: ignora `kind !== 'normal'` e transferências em receitas/despesas,
 * mas o «Saldo no período» considera saldo inicial e movimentos
 * (ver `summaryPeriodDelta`).
 */
export function TransactionsSummary() {
  const period = useTransactionsStore((s) => s.transactions.filters.period);
  const accountFilter = useTransactionsStore(
    (s) => s.transactions.filters.accountId,
  );
  const rows = useTransactionsStore((s) => s.transactions.items);

  const effectivePeriod = useMemo<EffectivePeriod>(
    () =>
      period.kind === "all"
        ? { kind: "month", month: currentMonthYYYYMM() }
        : period,
    [period],
  );

  const summaryAccountKey = accountFilter === "all" ? "all" : accountFilter;

  const summary = useMemo(() => {
    const { startISO, endISO } = effectiveBounds(effectivePeriod);
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    let period = 0;
    for (const t of rows) {
      if (t.date < startISO || t.date > endISO) continue;
      period += summaryPeriodDelta(t, summaryAccountKey);
      if (t.kind !== "normal") continue;
      if (t.type === "transfer") continue;
      if (t.type === "income") {
        income += t.amountCents;
        incomeCount += 1;
      } else {
        expense += t.amountCents;
        expenseCount += 1;
      }
    }
    return {
      income,
      expense,
      incomeCount,
      expenseCount,
      flow: income - expense,
      period,
    };
  }, [rows, summaryAccountKey, effectivePeriod]);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="tx-summary-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="tx-summary-title"
          className="text-base font-semibold text-base-content"
        >
          Resumo
        </h2>
        <span className="badge badge-soft badge-neutral">
          Período: {formatPeriodLabel(effectivePeriod)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryMetricCard
          label="Receitas do Período"
          value={formatCents(summary.income)}
          headerAction={<TrendingUp aria-hidden />}
          footer={
            <MetricFooterText>
              {pluralize(summary.incomeCount, "transação", "transações")}
            </MetricFooterText>
          }
        />

        <SummaryMetricCard
          label="Despesas do Período"
          value={formatCents(summary.expense)}
          headerAction={<TrendingDown aria-hidden />}
          footer={
            <MetricFooterText>
              {pluralize(summary.expenseCount, "transação", "transações")}
            </MetricFooterText>
          }
        />

        <SummaryMetricCard
          label="Saldo do Período"
          value={formatCents(summary.flow)}
          headerAction={<Equal aria-hidden />}
          footer={
            <MetricFooterText>{formatFlowStatus(summary.flow)}</MetricFooterText>
          }
        />
      </div>
    </section>
  );
}

type EffectivePeriod = Exclude<TransactionsPeriod, { kind: "all" }>;

function effectiveBounds(period: EffectivePeriod): {
  startISO: string;
  endISO: string;
} {
  if (period.kind === "month") return monthDayBounds(period.month);
  return { startISO: period.start, endISO: period.end };
}

function formatPeriodLabel(period: EffectivePeriod): string {
  if (period.kind === "month") return formatMonthYearForDisplay(period.month);
  return `${formatISODateForDisplay(period.start)} a ${formatISODateForDisplay(period.end)}`;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatFlowStatus(flowCents: number): string {
  if (flowCents > 0) return "Resultado positivo";
  if (flowCents < 0) return "Resultado negativo";
  return "Resultado neutro";
}

function MetricFooterText({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-xs text-base-content/60">{children}</p>;
}

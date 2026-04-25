/**
 * Faixa de KPIs da Home: receitas / despesas (mês actualmente filtrado),
 * saldo agregado das contas activas e total das facturas em aberto dos
 * cartões. Os valores vêm de `useDashboardHomeMetrics`.
 */
import {
  CreditCard,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { SummaryMetricCard } from "../../shared/components/ui/SummaryMetricCard";
import { formatCents } from "../../shared/utils/money-format";
import {
  useDashboardHomeMetrics,
  type DashboardHomeMetrics as Metrics,
} from "../hooks/useDashboardHomeMetrics";

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function MetricFooterText({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-xs text-base-content/60">{children}</p>;
}

function MetricCard({
  Icon,
  label,
  valueCents,
  footer,
}: {
  Icon: LucideIcon;
  label: string;
  valueCents: number;
  footer: React.ReactNode;
}) {
  return (
    <SummaryMetricCard
      icon={<Icon className="size-4" aria-hidden />}
      label={label}
      value={formatCents(valueCents)}
      footer={footer}
    />
  );
}

export function DashboardHomeMetrics() {
  const m: Metrics = useDashboardHomeMetrics();

  return (
    <section
      className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[900px]:grid-cols-4"
      aria-label="Resumo financeiro"
    >
      <MetricCard
        Icon={TrendingUp}
        label={`Receitas (${m.monthLabel})`}
        valueCents={m.income.cents}
        footer={
          <MetricFooterText>
            {pluralize(m.income.count, "transação", "transações")}
          </MetricFooterText>
        }
      />

      <MetricCard
        Icon={TrendingDown}
        label={`Despesas (${m.monthLabel})`}
        valueCents={m.expense.cents}
        footer={
          <MetricFooterText>
            {pluralize(m.expense.count, "transação", "transações")}
          </MetricFooterText>
        }
      />

      <MetricCard
        Icon={Wallet}
        label="Saldo atual"
        valueCents={m.balance.cents}
        footer={
          <MetricFooterText>
            {m.balance.accountsCount > 0
              ? pluralize(m.balance.accountsCount, "conta ativa", "contas ativas")
              : "Sem contas ativas"}
          </MetricFooterText>
        }
      />

      <MetricCard
        Icon={CreditCard}
        label={`Fatura (${m.monthLabel})`}
        valueCents={m.invoice.cents}
        footer={
          <MetricFooterText>
            {m.invoice.cardsCount > 0
              ? pluralize(m.invoice.cardsCount, "cartão", "cartões")
              : "Sem cartões cadastrados"}
          </MetricFooterText>
        }
      />
    </section>
  );
}

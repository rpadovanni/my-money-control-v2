/**
 * Faixa de 4 cartões de resumo na home com valores estáticos — só para validar
 * layout e tipografia até o resumo real ligar ao store.
 */
import {
  ArrowDown,
  ArrowUp,
  CreditCard,
  MoreVertical,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { SummaryMetricCard } from "../../shared/components/ui/SummaryMetricCard";
import { formatCents } from "../../shared/utils/money-format";

export function DashboardHomeMetricsPlaceholder() {
  return (
    <section
      className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[900px]:grid-cols-4"
      aria-label="Resumo financeiro (exemplo)"
    >
      {/* Receitas */}
      <SummaryMetricCard
        icon={<TrendingUp className="size-4" aria-hidden />}
        headerAction={<ArrowUp className="size-4" aria-hidden />}
        label="Receitas (Abril/2025)"
        value={formatCents(850_000)}
        footer={<p className="m-0 text-xs text-base-content/60">15 transações</p>}
      />

      {/* Despesas */}
      <SummaryMetricCard
        icon={<TrendingDown className="size-4" aria-hidden />}
        headerAction={<ArrowDown className="size-4" aria-hidden />}
        label="Despesas (Abril/2025)"
        value={formatCents(265_268)}
        footer={<p className="m-0 text-xs text-base-content/60">42 transações</p>}
      />

      {/* Saldo */}
      <SummaryMetricCard
        icon={<Wallet className="size-4" aria-hidden />}
        headerAction={<ArrowUp className="size-4" aria-hidden />}
        label="Saldo atual"
        value={formatCents(584_732)}
        footer={
          <p className="m-0 flex items-center gap-1 text-xs text-base-content/60">
            <ArrowUp className="size-3.5 shrink-0" aria-hidden />
            <span>+12% vs mês anterior</span>
          </p>
        }
      />

      {/* Fatura + progresso */}
      <SummaryMetricCard
        icon={<CreditCard className="size-4" aria-hidden />}
        headerAction={
          <button
            type="button"
            className="btn btn-ghost btn-square btn-xs text-base-content/60"
            aria-label="Mais opções da fatura"
          >
            <MoreVertical className="size-4" aria-hidden />
          </button>
        }
        label="Fatura atual"
        value={formatCents(163_077)}
        footer={
          <div className="flex flex-col gap-2">
            <progress
              className="progress progress-neutral h-2 w-full"
              value={32}
              max={100}
            />
            <div className="flex items-start justify-between gap-2 text-xs text-base-content/60">
              <span className="min-w-0">32% de {formatCents(500_000)}</span>
              <span className="shrink-0">Vence 15/05</span>
            </div>
          </div>
        }
      />
    </section>
  );
}

import { useMemo } from "react";
import { BadgeCheck, Building2, CreditCard, ReceiptText } from "lucide-react";
import { SummaryMetricCard } from "../../../shared/components/ui/SummaryMetricCard";
import { formatCents } from "../../../shared/utils/money-format";
import { useAccountsStore } from "../store/accounts.store";

/**
 * Faixa de KPIs da página «Contas e Cartões»:
 * - Total em contas (saldo agregado das contas não-cartão).
 * - Fatura atual (soma do que está em aberto nos cartões no mês civil).
 * - Contas activas (apenas tipo conta, exclui cartões).
 * - Cartões cadastrados.
 *
 * Não exibimos "Limite Disponível" — o modelo `Account` não persiste limite
 * de crédito; manter um card hard-coded daria a impressão de feature
 * funcional. Quando o domínio ganhar `creditLimitCents`, este card volta.
 */
export function AccountsSummaryMetrics() {
  const accounts = useAccountsStore((s) => s.accounts.items);
  const balancesByAccountId = useAccountsStore(
    (s) => s.accounts.balancesByAccountId,
  );
  const creditCardPayableByAccountId = useAccountsStore(
    (s) => s.accounts.creditCardPayableByAccountId,
  );

  const summary = useMemo(() => {
    let totalBalanceCents = 0;
    let currentInvoiceCents = 0;
    let bankAccountsCount = 0;
    let creditCardsCount = 0;

    for (const account of accounts) {
      if (account.type === "credit_card") {
        creditCardsCount += 1;
        currentInvoiceCents += creditCardPayableByAccountId[account.id] ?? 0;
        continue;
      }
      bankAccountsCount += 1;
      totalBalanceCents += balancesByAccountId[account.id] ?? 0;
    }

    return {
      totalBalanceCents,
      currentInvoiceCents,
      bankAccountsCount,
      creditCardsCount,
    };
  }, [accounts, balancesByAccountId, creditCardPayableByAccountId]);

  return (
    <section
      className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-4"
      aria-label="Resumo das contas"
    >
      <SummaryMetricCard
        label="Total em Contas"
        value={formatCents(summary.totalBalanceCents)}
        headerAction={<Building2 aria-hidden />}
      />

      <SummaryMetricCard
        label="Fatura Atual"
        value={formatCents(summary.currentInvoiceCents)}
        headerAction={<ReceiptText aria-hidden />}
      />

      <SummaryMetricCard
        label="Contas Ativas"
        value={summary.bankAccountsCount}
        headerAction={<BadgeCheck aria-hidden />}
      />

      <SummaryMetricCard
        label="Cartões"
        value={summary.creditCardsCount}
        headerAction={<CreditCard aria-hidden />}
      />
    </section>
  );
}

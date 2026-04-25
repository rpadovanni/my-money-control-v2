import { BadgeCheck, Building2, CreditCard, ReceiptText } from "lucide-react";
import { SummaryMetricCard } from "../../../shared/components/ui/SummaryMetricCard";
import { formatCents } from "../../../shared/utils/money-format";
import { useAccountsStore } from "../store/accounts.store";

export function AccountsSummaryMetrics() {
  const accounts = useAccountsStore((s) => s.accounts.items);
  const balancesByAccountId = useAccountsStore(
    (s) => s.accounts.balancesByAccountId,
  );
  const creditCardPayableByAccountId = useAccountsStore(
    (s) => s.accounts.creditCardPayableByAccountId,
  );

  let totalBalanceCents = 0;
  let currentInvoiceCents = 0;

  for (const account of accounts) {
    if (account.type === "credit_card") {
      currentInvoiceCents += creditCardPayableByAccountId[account.id] ?? 0;
      continue;
    }
    totalBalanceCents += balancesByAccountId[account.id] ?? 0;
  }

  return (
    <section
      className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-4"
      aria-label="Resumo das contas"
    >
      <SummaryMetricCard
        label="Total em Contas"
        value={formatCents(totalBalanceCents)}
        headerAction={<Building2 aria-hidden />}
      />

      <SummaryMetricCard
        label="Limite Disponível"
        value={formatCents(0)}
        headerAction={<CreditCard aria-hidden />}
      />

      <SummaryMetricCard
        label="Fatura Atual"
        value={formatCents(currentInvoiceCents)}
        headerAction={<ReceiptText aria-hidden />}
      />

      <SummaryMetricCard
        label="Contas Ativas"
        value={accounts.length}
        headerAction={<BadgeCheck aria-hidden />}
      />
    </section>
  );
}

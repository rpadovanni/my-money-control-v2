/**
 * Mapeia transações filtradas do store para itens de {@link TransactionList}
 * (títulos, categorias visíveis e chave de ícone — sem ReactNode pré-criado,
 * para manter o ViewModel serializável e a renderização do ícone na UI).
 */
import { useMemo } from "react";
import type { Transaction } from "../../../domain/transactions/types";
import { formatRelativeDay } from "../../../shared/lib/dates";
import { formatCents } from "../../../shared/utils/money-format";
import type { TransactionListItem } from "../components/TransactionList";
import { iconKindForTransaction } from "../utils/transaction-row-icon";

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; label: string };

type Lookup = {
  accountName: (accountId: string) => string;
  categoryLabel: (categoryId: string) => string;
};

function buildLookup(
  accounts: AccountOption[],
  archivedAccounts: AccountOption[],
  categories: CategoryOption[],
): Lookup {
  const accountById = new Map<string, string>();
  for (const a of accounts) accountById.set(a.id, a.name);
  for (const a of archivedAccounts) accountById.set(a.id, a.name);

  const categoryById = new Map<string, string>();
  for (const c of categories) categoryById.set(c.id, c.label);

  return {
    accountName: (accountId) => accountById.get(accountId) ?? accountId,
    categoryLabel: (categoryId) => categoryById.get(categoryId) ?? categoryId,
  };
}

export function useTransactionListItems(
  rows: Transaction[],
  accounts: AccountOption[],
  archivedAccounts: AccountOption[],
  categories: CategoryOption[],
): TransactionListItem[] {
  return useMemo(() => {
    const { accountName, categoryLabel } = buildLookup(
      accounts,
      archivedAccounts,
      categories,
    );

    return rows.map((t): TransactionListItem => {
      const when = formatRelativeDay(t.date);
      const iconKind = iconKindForTransaction(t);

      if (t.kind === "opening_balance") {
        return {
          id: t.id,
          title: "Saldo inicial",
          category: accountName(t.accountId),
          dateLabel: when,
          amountCents: t.amountCents,
          iconKind,
        };
      }

      if (t.type === "transfer") {
        const from = accountName(t.fromAccountId ?? "");
        const to = accountName(t.toAccountId ?? "");
        const desc = t.description?.trim();
        return {
          id: t.id,
          title: desc || `${from} → ${to}`,
          category: "Transferência",
          dateLabel: when,
          amountCents: t.amountCents,
          amountTextOverride: `↔ ${formatCents(t.amountCents)}`,
          iconKind,
        };
      }

      const income = t.type === "income";
      const cat = categoryLabel(t.category);
      const acc = accountName(t.accountId);
      const desc = t.description?.trim();

      return {
        id: t.id,
        title: desc || cat,
        category: desc ? cat : acc,
        dateLabel: when,
        amountCents: income ? t.amountCents : -t.amountCents,
        iconKind,
      };
    });
  }, [rows, accounts, archivedAccounts, categories]);
}

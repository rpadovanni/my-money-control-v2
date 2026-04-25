/**
 * Composição da feature: lista de transações filtradas + ações por linha
 * (editar / excluir) + diálogo de confirmação para exclusão.
 */
import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "../../../shared/components/ui/ConfirmDialog";
import {
  KebabMenu,
  KebabMenuItem,
} from "../../../shared/components/ui/KebabMenu";
import { errMessage } from "../../../shared/utils/error-message";
import { useTransactionsStore } from "../store/transactions.store";
import { useTransactionListItems } from "../hooks/useTransactionListItems";
import { TransactionList } from "./TransactionList";

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; label: string };

export type TransactionsListSectionProps = {
  accounts: AccountOption[];
  archivedAccounts: AccountOption[];
  categories: CategoryOption[];
  pushToast: (
    variant: "success" | "error",
    message: string,
    durationMs?: number,
  ) => void;
  setNotice: (n: null | { variant: "error"; message: string }) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  setSubmittingTx: (v: boolean) => void;
  /** Slot opcional para estado vazio (texto contextual à rota). */
  emptySlot?: React.ReactNode;
};

export function TransactionsListSection({
  accounts,
  archivedAccounts,
  categories,
  pushToast,
  setNotice,
  editingId,
  setEditingId,
  setSubmittingTx,
  emptySlot,
}: TransactionsListSectionProps) {
  const rows = useTransactionsStore((s) => s.transactions.items);
  const remove = useTransactionsStore((s) => s.deleteTransaction);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const items = useTransactionListItems(
    rows,
    accounts,
    archivedAccounts,
    categories,
  );

  const itemsWithActions = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        actions: (
          <KebabMenu ariaLabel={`Ações da transação ${item.title}`}>
            <KebabMenuItem
              icon={<Pencil className="size-4" aria-hidden />}
              label="Editar"
              onSelect={() => setEditingId(item.id)}
            />
            <KebabMenuItem
              icon={<Trash2 className="size-4" aria-hidden />}
              label="Excluir"
              variant="danger"
              onSelect={() => setPendingDeleteId(item.id)}
            />
          </KebabMenu>
        ),
      })),
    [items, setEditingId],
  );

  async function confirmDelete() {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (!id) return;
    setSubmittingTx(true);
    setNotice(null);
    try {
      await remove(id);
      if (editingId === id) setEditingId(null);
      pushToast("success", "Transação excluída.");
    } catch (err) {
      setNotice({ variant: "error", message: errMessage(err) });
    } finally {
      setSubmittingTx(false);
    }
  }

  return (
    <>
      <TransactionList
        items={itemsWithActions}
        title="Transações"
        emptySlot={emptySlot}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Excluir transação?"
        description="Esta ação não pode ser desfeita. A transação será removida permanentemente."
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
}

/**
 * Modal que envolve `TransactionForm` para criação ou edição. O título reflecte
 * a intenção (incluir / editar / saldo inicial) com base em `editingId` e nas
 * transações em store.
 *
 * `open` é controlado pelo consumidor e tipicamente derivado de
 * `editingId !== null || creating`. `onClose` deve limpar ambos os sinais.
 */
import { useMemo } from "react";
import { Modal } from "../../../shared/components/ui/Modal";
import { useTransactionsStore } from "../store/transactions.store";
import {
  TransactionForm,
  type TransactionFormProps,
} from "./TransactionForm";

export type TransactionFormDialogProps = Omit<TransactionFormProps, "onClose"> & {
  open: boolean;
  onClose: () => void;
};

export function TransactionFormDialog({
  open,
  onClose,
  editingId,
  ...formProps
}: TransactionFormDialogProps) {
  const rows = useTransactionsStore((s) => s.transactions.items);
  const editing = useMemo(
    () => rows.find((t) => t.id === editingId) ?? null,
    [editingId, rows],
  );

  const title = editing
    ? editing.kind === "opening_balance"
      ? "Saldo inicial"
      : editing.type === "transfer"
        ? "Editar transferência"
        : "Editar transação"
    : "Nova transação";

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {open ? (
        // Renderizamos o formulário só enquanto o modal está aberto: assim o
        // estado interno (campos, rascunho) é descartado a cada fecho. Evita
        // que dados de uma criação anterior reapareçam ao reabrir «Nova
        // transação».
        <TransactionForm
          {...formProps}
          editingId={editingId}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

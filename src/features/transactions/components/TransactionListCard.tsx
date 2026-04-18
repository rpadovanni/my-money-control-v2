import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Inbox, Pencil, Trash2, X } from "lucide-react";
import { formatISODateForDisplay } from "../../../shared/lib/dates";
import {
  errMessage,
  formatCents,
  signedFormatCents,
} from "../../../shared/utils/money-format";
import { useTransactionsStore } from "../store/transactions.store";

export type TxListAccountOption = { id: string; name: string };
export type TxListCategoryOption = { id: string; label: string };

export function TransactionListCard({
  accounts,
  archivedAccounts,
  categories,
  pushToast,
  setNotice,
  editingId,
  setEditingId,
  setSubmittingTx,
  transactionsRouteActive,
}: {
  accounts: TxListAccountOption[];
  archivedAccounts: TxListAccountOption[];
  categories: TxListCategoryOption[];
  pushToast: (
    variant: "success" | "error",
    message: string,
    durationMs?: number,
  ) => void;
  setNotice: (n: null | { variant: "error"; message: string }) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  setSubmittingTx: (v: boolean) => void;
  /** `true` quando a rota é `/transactions` (texto do empty state). */
  transactionsRouteActive: boolean;
}) {
  const rows = useTransactionsStore((s) => s.transactions.items);
  const remove = useTransactionsStore((s) => s.deleteTransaction);

  const [deleteConfirmTransactionId, setDeleteConfirmTransactionId] = useState<
    string | null
  >(null);
  const confirmTitleId = useId();
  const confirmDescId = useId();
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);

  const dismissDeleteConfirm = useCallback(() => {
    const restore = previouslyFocusedRef.current;
    setDeleteConfirmTransactionId(null);
    queueMicrotask(() => restore?.focus?.());
  }, []);

  useEffect(() => {
    if (!deleteConfirmTransactionId) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismissDeleteConfirm();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const id = requestAnimationFrame(() => confirmCancelRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [deleteConfirmTransactionId, dismissDeleteConfirm]);

  function accountName(id: string) {
    return (
      accounts.find((a) => a.id === id)?.name ??
      archivedAccounts.find((a) => a.id === id)?.name ??
      id
    );
  }

  async function runDeleteTransaction(id: string) {
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

  function requestDeleteTransaction(id: string) {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    setDeleteConfirmTransactionId(id);
  }

  async function handleDeleteConfirmPrimary() {
    const id = deleteConfirmTransactionId;
    const restore = previouslyFocusedRef.current;
    setDeleteConfirmTransactionId(null);
    queueMicrotask(() => restore?.focus?.());
    if (id) await runDeleteTransaction(id);
  }

  function onConfirmDialogKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const root = e.currentTarget;
    const focusables = [
      ...root.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
    ];
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body">
          <h2 className="card-title">Transações</h2>
          {rows.length === 0 ? (
            <div className="py-6 text-center">
              <Inbox className="mx-auto size-12 opacity-40" aria-hidden />
              <p className="mt-2 font-semibold">
                Nenhuma transação neste período
              </p>
              <p className="text-base-content/70">
                Ajuste mês, conta ou tipo nos filtros — ou inclua um lançamento{" "}
                {transactionsRouteActive
                  ? "no formulário ao lado"
                  : "no formulário acima"}
                .
              </p>
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {rows.map((t) => (
                <li
                  key={t.id}
                  className="rounded-box border border-base-300 bg-base-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="leading-snug [&_strong]:text-[1.05rem]">
                        {t.kind === "opening_balance" ? (
                          <strong className="text-info">
                            {signedFormatCents(t.amountCents)}
                          </strong>
                        ) : t.type === "transfer" ? (
                          <strong className="text-info">
                            ↔ {formatCents(t.amountCents)}
                          </strong>
                        ) : (
                          <strong
                            className={
                              t.type === "income"
                                ? "text-success"
                                : "text-error"
                            }
                          >
                            {t.type === "income" ? "+" : "−"}{" "}
                            {formatCents(t.amountCents)}
                          </strong>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-base-content/70">
                        {t.kind === "opening_balance" ? (
                          <>Saldo inicial • {accountName(t.accountId)}</>
                        ) : t.type === "transfer" ? (
                          <>
                            Transferência • {accountName(t.fromAccountId ?? "")}{" "}
                            → {accountName(t.toAccountId ?? "")}
                            {t.description ? ` • ${t.description}` : ""}
                          </>
                        ) : (
                          <>
                            {categories.find((c) => c.id === t.category)
                              ?.label ?? t.category}{" "}
                            • {accountName(t.accountId)}
                            {t.description ? ` • ${t.description}` : ""}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-xs text-base-content/60">
                        {formatISODateForDisplay(t.date)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-square"
                          onClick={() => setEditingId(t.id)}
                          aria-label="Editar transação"
                          title="Editar"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-error btn-sm btn-square"
                          onClick={() => void requestDeleteTransaction(t.id)}
                          aria-label="Excluir transação"
                          title="Excluir"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {deleteConfirmTransactionId ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismissDeleteConfirm();
          }}
        >
          <div
            className="w-full max-w-[420px] rounded-box border border-base-300 bg-base-100 p-5 shadow"
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmDescId}
            onKeyDown={onConfirmDialogKeyDown}
          >
            <h2 id={confirmTitleId} className="mb-2.5 mt-0 text-lg font-bold">
              Excluir transação?
            </h2>
            <p
              id={confirmDescId}
              className="mb-4 mt-0 text-sm text-base-content/70"
            >
              Esta ação não pode ser desfeita. A transação será removida
              permanentemente.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                ref={confirmCancelRef}
                type="button"
                className="btn btn-ghost"
                onClick={dismissDeleteConfirm}
              >
                <X className="size-4" aria-hidden />
                <span>Voltar</span>
              </button>
              <button
                type="button"
                className="btn btn-outline btn-error"
                onClick={() => void handleDeleteConfirmPrimary()}
              >
                <Trash2 className="size-4" aria-hidden />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * Lista de contas (incluindo cartões) com acções rápidas: editar, definir
 * como padrão, arquivar, restaurar e «Pagar fatura» (transferência → cartão).
 *
 * A criação e edição de contas migraram para o `AccountFormDialog`, accionado
 * pelos botões «Adicionar conta» / «Adicionar cartão» no cabeçalho da página
 * (e pelo lápis «Editar» nesta lista, que delega no callback `onEditAccount`).
 */
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Check,
  CreditCard,
  Eye,
  Landmark,
  Loader2,
  Pencil,
  Star,
  Undo2,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import { ConfirmDialog } from "../../../shared/components/ui/ConfirmDialog";
import {
  currentMonthYYYYMM,
  formatMonthYearForDisplay,
  todayISODate,
} from "../../../shared/lib/dates";
import { formatCents } from "../../../shared/utils/money-format";
import { cn } from "../../../shared/utils/cn";
import { errMessage } from "../../../shared/utils/error-message";
import { Input } from "../../../shared/components/ui/Input";
import { Select } from "../../../shared/components/ui/Select";
import { useAccountsStore } from "../store/accounts.store";
import type { Account, AccountType } from "../types/accounts";

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  bank: "Banco",
  wallet: "Carteira",
  credit_card: "Cartão de crédito",
  other: "Outro",
};

const ACCOUNT_ICON: Record<AccountType, typeof Landmark> = {
  bank: Landmark,
  wallet: Wallet,
  credit_card: CreditCard,
  other: WalletCards,
};

export type AddTransferPayload = {
  type: "transfer";
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  date: string;
  category: string;
  description?: string;
};

export function AccountsCard({
  onAddTransfer,
  pushToast,
  setNotice,
  onEditAccount,
}: {
  onAddTransfer: (input: AddTransferPayload) => Promise<void>;
  pushToast: (
    variant: "success" | "error",
    message: string,
    durationMs?: number,
  ) => void;
  setNotice: (n: null | { variant: "error"; message: string }) => void;
  /** Abre o modal de edição (a página gere o estado do dialog). */
  onEditAccount: (account: Account) => void;
}) {
  const accounts = useAccountsStore((s) => s.accounts.items);
  const archivedAccounts = useAccountsStore((s) => s.accounts.archivedItems);
  const balancesByAccountId = useAccountsStore(
    (s) => s.accounts.balancesByAccountId,
  );
  const creditCardPayableByAccountId = useAccountsStore(
    (s) => s.accounts.creditCardPayableByAccountId,
  );
  const setDefaultAccount = useAccountsStore((s) => s.setDefaultAccount);
  const archiveAccount = useAccountsStore((s) => s.archiveAccount);
  const unarchiveAccount = useAccountsStore((s) => s.unarchiveAccount);

  const payInvoiceAmountRef = useRef<HTMLInputElement>(null);

  const [submittingPayInvoice, setSubmittingPayInvoice] = useState(false);

  const [payInvoice, setPayInvoice] = useState<null | { cardId: string }>(null);
  const [payFromId, setPayFromId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => todayISODate());
  const [detailsAccountId, setDetailsAccountId] = useState<string | null>(null);

  const [archiveConfirm, setArchiveConfirm] = useState<null | {
    accountId: string;
    displayName: string;
  }>(null);

  useEffect(() => {
    if (!payInvoice) return;
    payInvoiceAmountRef.current?.focus();
  }, [payInvoice]);

  const defaultAccountId =
    accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? "";

  const payRaw = payAmount.trim().replace(",", ".");
  const payNum = payRaw.length > 0 ? Number(payRaw) : Number.NaN;
  const canSubmitPayInvoice =
    payInvoice != null &&
    payFromId.length > 0 &&
    payFromId !== payInvoice.cardId &&
    payAmount.trim().length > 0 &&
    Number.isFinite(payNum) &&
    Math.round(payNum * 100) > 0;

  function accountName(id: string) {
    return (
      accounts.find((a) => a.id === id)?.name ??
      archivedAccounts.find((a) => a.id === id)?.name ??
      id
    );
  }

  function openPayInvoice(cardId: string) {
    setPayInvoice({ cardId });
    const suggested = creditCardPayableByAccountId[cardId] ?? 0;
    setPayAmount(suggested > 0 ? String(suggested / 100) : "");
    setPayDate(todayISODate());
    const eligible = accounts.filter(
      (a) => a.id !== cardId && a.type !== "credit_card",
    );
    const from =
      eligible.find((a) => a.isDefault)?.id ??
      eligible[0]?.id ??
      defaultAccountId;
    setPayFromId(from);
  }

  async function runArchiveAccountAction(id: string) {
    setNotice(null);
    try {
      await archiveAccount(id);
      pushToast("success", "Conta arquivada.");
    } catch (err) {
      setNotice({ variant: "error", message: errMessage(err) });
    }
  }

  function requestArchiveAccount(id: string, displayName: string) {
    setArchiveConfirm({ accountId: id, displayName });
  }

  async function handleArchiveConfirmPrimary() {
    if (!archiveConfirm) return;
    const state = archiveConfirm;
    setArchiveConfirm(null);
    await runArchiveAccountAction(state.accountId);
  }

  async function handleSetDefaultAccount(id: string) {
    setNotice(null);
    try {
      await setDefaultAccount(id);
      pushToast("success", "Conta padrão atualizada.");
    } catch (err) {
      setNotice({ variant: "error", message: errMessage(err) });
    }
  }

  async function handleUnarchiveAccount(id: string) {
    setNotice(null);
    try {
      await unarchiveAccount(id);
      pushToast("success", "Conta restaurada.");
    } catch (err) {
      setNotice({ variant: "error", message: errMessage(err) });
    }
  }

  async function onSubmitPayInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitPayInvoice || !payInvoice || submittingPayInvoice) return;

    const amountCents = Math.round(payNum * 100);
    const nm = accountName(payInvoice.cardId);
    const label = formatMonthYearForDisplay(currentMonthYYYYMM());

    setSubmittingPayInvoice(true);
    setNotice(null);
    try {
      if (payFromId === payInvoice.cardId) {
        pushToast("error", "Escolha outra conta para debitar o pagamento.");
        return;
      }
      await onAddTransfer({
        type: "transfer",
        fromAccountId: payFromId,
        toAccountId: payInvoice.cardId,
        amountCents,
        date: payDate,
        category: "transfer",
        description: `Pagamento fatura — ${nm} (${label})`,
      });
      setPayInvoice(null);
      pushToast("success", "Pagamento de fatura registrado.");
    } catch (err) {
      setNotice({ variant: "error", message: errMessage(err) });
    } finally {
      setSubmittingPayInvoice(false);
    }
  }

  const faturaMesLabel = formatMonthYearForDisplay(currentMonthYYYYMM());
  const accountGroups = [
    {
      id: "bank-accounts",
      title: "Contas Bancárias",
      items: accounts.filter((a) => a.type !== "credit_card"),
    },
    {
      id: "credit-cards",
      title: "Cartões de Crédito",
      items: accounts.filter((a) => a.type === "credit_card"),
    },
  ];

  return (
    <>
      <section className="flex flex-col gap-4" aria-label="Contas">
          <p className="text-sm text-base-content/70">
            Saldo por conta = histórico completo. Em cartões, &quot;A
            pagar&quot; usa sempre o <strong>mês civil atual</strong>{" "}
            (independente do filtro da lista).
          </p>

          {accounts.length === 0 ? (
            <div className="py-6 text-center">
              <WalletCards className="mx-auto size-12 opacity-40" aria-hidden />
              <p className="mt-2 font-semibold">Nenhuma conta cadastrada</p>
              <p className="text-base-content/70">
                Use «Adicionar conta» ou «Adicionar cartão» no topo da página
                para começar a lançar transações.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {accountGroups.map(({ id, title, items }) =>
                items.length > 0 ? (
                  <section key={id} aria-labelledby={id}>
                    <h2
                      id={id}
                      className="m-0 text-lg font-semibold text-base-content"
                    >
                      {title}
                    </h2>

                    <ul className="mt-3 space-y-2">
                      {items.map((a: Account) => {
                        const Icon = ACCOUNT_ICON[a.type];
                        const balance = balancesByAccountId[a.id] ?? 0;
                        const invoice = creditCardPayableByAccountId[a.id] ?? 0;
                        const detailsOpen =
                          detailsAccountId === a.id ||
                          payInvoice?.cardId === a.id;

                        return (
                          <li
                            key={a.id}
                            className="rounded-box border border-base-300 bg-base-100 p-3"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-box bg-base-200 text-base-content/70">
                                  <Icon className="size-5" aria-hidden />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <strong className="truncate text-base text-base-content">
                                      {a.name}
                                    </strong>
                                    {a.isDefault ? (
                                      <span className="badge badge-neutral badge-sm">
                                        Principal
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="m-0 mt-1 truncate text-sm text-base-content/70">
                                    {ACCOUNT_TYPE_LABEL[a.type]}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <div className="text-left md:min-w-36 md:text-right">
                                  <div className="text-xs text-base-content/60">
                                    {a.type === "credit_card"
                                      ? "Saldo Contábil"
                                      : "Saldo Atual"}
                                  </div>
                                  <div
                                    className={cn(
                                      "text-xl font-semibold tabular-nums",
                                      balance >= 0
                                        ? "text-base-content"
                                        : "text-error",
                                    )}
                                  >
                                    {formatCents(balance)}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-neutral btn-xs"
                                    onClick={() =>
                                      setDetailsAccountId(
                                        detailsOpen ? null : a.id,
                                      )
                                    }
                                  >
                                    <Eye className="size-4" aria-hidden />
                                    <span>Ver Detalhes</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-outline btn-xs btn-square"
                                    onClick={() => onEditAccount(a)}
                                    aria-label={`Editar conta ${a.name}`}
                                    title="Editar"
                                  >
                                    <Pencil className="size-4" aria-hidden />
                                  </button>

                                  {!a.isDefault ? (
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-xs btn-square"
                                      onClick={() =>
                                        void handleSetDefaultAccount(a.id)
                                      }
                                      aria-label="Definir como conta padrão"
                                      title="Conta padrão"
                                    >
                                      <Star className="size-4" aria-hidden />
                                    </button>
                                  ) : null}

                                  <button
                                    type="button"
                                    className="btn btn-outline btn-error btn-xs btn-square"
                                    disabled={accounts.length <= 1}
                                    onClick={() =>
                                      void requestArchiveAccount(a.id, a.name)
                                    }
                                    aria-label={`Arquivar conta ${a.name}`}
                                    title="Arquivar"
                                  >
                                    <Archive className="size-4" aria-hidden />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {detailsOpen ? (
                              <div className="mt-3 rounded-box border border-base-200 bg-base-200/40 p-3">
                                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                  <div>
                                    <div className="text-xs text-base-content/60">
                                      Tipo
                                    </div>
                                    <div className="font-medium">
                                      {ACCOUNT_TYPE_LABEL[a.type]}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-base-content/60">
                                      Saldo contábil
                                    </div>
                                    <div className="font-medium">
                                      {formatCents(balance)}
                                    </div>
                                  </div>

                                  {a.type === "credit_card" ? (
                                    <div className="sm:col-span-2">
                                      <div className="text-xs text-base-content/60">
                                        Fatura atual ({faturaMesLabel})
                                      </div>
                                      <div className="mt-1 font-bold text-warning">
                                        A pagar: {formatCents(invoice)}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                {a.type === "credit_card" ? (
                                  payInvoice?.cardId === a.id ? (
                                    <form
                                      className="mt-3 grid grid-cols-1 gap-3 rounded-box border border-base-300 bg-base-100 p-3"
                                      onSubmit={onSubmitPayInvoice}
                                    >
                                      <Select
                                        label="Pagar de"
                                        value={payFromId}
                                        onChange={(e) =>
                                          setPayFromId(e.target.value)
                                        }
                                      >
                                        {(accounts.filter(
                                          (x) =>
                                            x.id !== a.id &&
                                            x.type !== "credit_card",
                                        ).length > 0
                                          ? accounts.filter(
                                              (x) =>
                                                x.id !== a.id &&
                                                x.type !== "credit_card",
                                            )
                                          : accounts.filter(
                                              (x) => x.id !== a.id,
                                            )
                                        ).map((x) => (
                                          <option key={x.id} value={x.id}>
                                            {x.name}
                                          </option>
                                        ))}
                                      </Select>
                                      <Input
                                        ref={payInvoiceAmountRef}
                                        label="Valor (R$)"
                                        inputMode="decimal"
                                        value={payAmount}
                                        onChange={(e) =>
                                          setPayAmount(
                                            e.target.value.replace(",", "."),
                                          )
                                        }
                                      />
                                      <Input
                                        label="Data"
                                        type="date"
                                        value={payDate}
                                        onChange={(e) =>
                                          setPayDate(e.target.value)
                                        }
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          className="btn btn-ghost"
                                          onClick={() => setPayInvoice(null)}
                                        >
                                          <X className="size-4" aria-hidden />
                                          <span>Voltar</span>
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={
                                            !canSubmitPayInvoice ||
                                            submittingPayInvoice
                                          }
                                          className="btn btn-primary"
                                        >
                                          {submittingPayInvoice ? (
                                            <Loader2
                                              className="size-4 animate-spin"
                                              aria-hidden
                                            />
                                          ) : (
                                            <Check
                                              className="size-4"
                                              aria-hidden
                                            />
                                          )}
                                          <span>
                                            {submittingPayInvoice
                                              ? "Registrando…"
                                              : "Registrar"}
                                          </span>
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-sm mt-3"
                                      onClick={() => openPayInvoice(a.id)}
                                    >
                                      <CreditCard
                                        className="size-4"
                                        aria-hidden
                                      />
                                      <span>Pagar fatura</span>
                                    </button>
                                  )
                                ) : null}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null,
              )}
            </div>
          )}

          {archivedAccounts.length > 0 ? (
            <details className="mt-4">
              <summary>
                Contas arquivadas{" "}
                <span className="text-base-content/70">
                  ({archivedAccounts.length})
                </span>
              </summary>
              <ul className="mt-2 space-y-2">
                {archivedAccounts.map((a: Account) => (
                  <li
                    key={a.id}
                    className="rounded-box border border-base-300 bg-base-100 p-3 opacity-95"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{a.name}</strong>
                          {a.isDefault ? (
                            <span className="badge badge-neutral">Padrão</span>
                          ) : null}
                        </div>
                        {a.type === "credit_card" ? (
                          <>
                            <div className="mt-2 text-xs text-base-content/70">
                              Fatura ({faturaMesLabel})
                            </div>
                            <div className="mt-1 text-[13px] font-bold text-warning">
                              A pagar:{" "}
                              {formatCents(
                                creditCardPayableByAccountId[a.id] ?? 0,
                              )}
                            </div>
                            <div className="mt-1 text-xs font-medium text-base-content/70">
                              Saldo (contábil):{" "}
                              {formatCents(balancesByAccountId[a.id] ?? 0)}
                            </div>
                          </>
                        ) : (
                          <div
                            className={`mt-2 text-[13px] font-bold ${
                              (balancesByAccountId[a.id] ?? 0) >= 0
                                ? "text-success"
                                : "text-error"
                            }`}
                          >
                            Saldo: {formatCents(balancesByAccountId[a.id] ?? 0)}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className="text-xs text-base-content/60"
                          title={ACCOUNT_TYPE_LABEL[a.type]}
                        >
                          {ACCOUNT_TYPE_LABEL[a.type]}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square"
                            onClick={() => onEditAccount(a)}
                            aria-label={`Editar conta ${a.name}`}
                            title="Editar"
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square"
                            onClick={() => void handleUnarchiveAccount(a.id)}
                            aria-label={`Restaurar conta ${a.name}`}
                            title="Restaurar"
                          >
                            <Undo2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
      </section>

      <ConfirmDialog
        open={archiveConfirm !== null}
        title="Arquivar conta?"
        description={
          archiveConfirm
            ? `Arquivar a conta "${archiveConfirm.displayName}"? Você pode restaurá-la depois em contas arquivadas.`
            : undefined
        }
        confirmLabel="Arquivar"
        confirmIcon={<Archive className="size-4" aria-hidden />}
        onConfirm={() => void handleArchiveConfirmPrimary()}
        onCancel={() => setArchiveConfirm(null)}
      />
    </>
  );
}

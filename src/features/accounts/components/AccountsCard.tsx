import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Check,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  Star,
  Undo2,
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
}: {
  onAddTransfer: (input: AddTransferPayload) => Promise<void>;
  pushToast: (
    variant: "success" | "error",
    message: string,
    durationMs?: number,
  ) => void;
  setNotice: (n: null | { variant: "error"; message: string }) => void;
}) {
  const accounts = useAccountsStore((s) => s.accounts.items);
  const archivedAccounts = useAccountsStore((s) => s.accounts.archivedItems);
  const balancesByAccountId = useAccountsStore(
    (s) => s.accounts.balancesByAccountId,
  );
  const creditCardPayableByAccountId = useAccountsStore(
    (s) => s.accounts.creditCardPayableByAccountId,
  );
  const addAccount = useAccountsStore((s) => s.addAccount);
  const setDefaultAccount = useAccountsStore((s) => s.setDefaultAccount);
  const archiveAccount = useAccountsStore((s) => s.archiveAccount);
  const unarchiveAccount = useAccountsStore((s) => s.unarchiveAccount);
  const getAccountOpeningForEdit = useAccountsStore(
    (s) => s.getAccountOpeningForEdit,
  );
  const updateAccountDetails = useAccountsStore((s) => s.updateAccountDetails);

  const accountFormNameRef = useRef<HTMLInputElement>(null);
  const payInvoiceAmountRef = useRef<HTMLInputElement>(null);

  const [submittingAccount, setSubmittingAccount] = useState(false);
  const [submittingAccountEdit, setSubmittingAccountEdit] = useState(false);
  const [submittingPayInvoice, setSubmittingPayInvoice] = useState(false);

  const [payInvoice, setPayInvoice] = useState<null | { cardId: string }>(null);
  const [payFromId, setPayFromId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => todayISODate());

  const [accountForm, setAccountForm] = useState(() => ({
    name: "",
    type: "bank" as AccountType,
    openingBalance: "",
    makeDefault: false,
  }));

  const [accountEdit, setAccountEdit] = useState<null | {
    id: string;
    name: string;
    type: AccountType;
    openingBalance: string;
    openingDate: string;
  }>(null);

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

  const canSubmitAccount =
    accountForm.name.trim().length > 0 && accountEdit == null;

  const accountEditOpeningRaw =
    accountEdit?.openingBalance.trim().replace(",", ".") ?? "";
  const accountEditOpeningValid =
    accountEditOpeningRaw.length === 0 ||
    Number.isFinite(Number(accountEditOpeningRaw));
  const canSubmitAccountEdit =
    accountEdit != null &&
    accountEdit.name.trim().length > 0 &&
    accountEditOpeningValid;

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
    const from =
      accounts.find(
        (a) => a.isDefault && a.id !== cardId && a.type !== "credit_card",
      )?.id ??
      accounts.find((a) => a.id !== cardId && a.type !== "credit_card")?.id ??
      defaultAccountId;
    setPayFromId(from);
  }

  async function onSubmitAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitAccount || accountEdit || submittingAccount) return;

    setSubmittingAccount(true);
    setNotice(null);
    try {
      const obRaw = accountForm.openingBalance.trim().replace(",", ".");
      const openingBalanceCents =
        obRaw.length > 0 && Number.isFinite(Number(obRaw))
          ? Math.round(Number(obRaw) * 100)
          : undefined;

      await addAccount({
        name: accountForm.name.trim(),
        type: accountForm.type,
        makeDefault: accountForm.makeDefault,
        openingBalanceCents,
      });

      setAccountForm({
        name: "",
        type: "bank",
        openingBalance: "",
        makeDefault: false,
      });
      pushToast("success", "Conta criada.");
      queueMicrotask(() => accountFormNameRef.current?.focus());
    } catch (err) {
      setNotice({ variant: "error", message: errMessage(err) });
    } finally {
      setSubmittingAccount(false);
    }
  }

  async function beginEditAccount(a: Account) {
    setNotice(null);
    try {
      const snap = await getAccountOpeningForEdit(a.id);
      setAccountEdit({
        id: a.id,
        name: a.name,
        type: a.type,
        openingBalance:
          snap.amountCents != null ? String(snap.amountCents / 100) : "",
        openingDate: snap.date,
      });
    } catch (err) {
      setNotice({ variant: "error", message: errMessage(err) });
    }
  }

  async function onSubmitAccountEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitAccountEdit || !accountEdit || submittingAccountEdit) return;

    setSubmittingAccountEdit(true);
    setNotice(null);
    try {
      const raw = accountEdit.openingBalance.trim().replace(",", ".");
      let openingBalanceCents: number | null = null;
      if (raw.length > 0) {
        if (!Number.isFinite(Number(raw))) {
          pushToast("error", "Saldo inicial inválido.");
          return;
        }
        const cents = Math.round(Number(raw) * 100);
        openingBalanceCents = cents === 0 ? null : cents;
      }

      await updateAccountDetails(accountEdit.id, {
        name: accountEdit.name.trim(),
        type: accountEdit.type,
        openingBalanceCents,
        openingDate: accountEdit.openingDate,
      });
      setAccountEdit(null);
      pushToast("success", "Conta atualizada.");
      queueMicrotask(() => accountFormNameRef.current?.focus());
    } catch (err) {
      setNotice({ variant: "error", message: errMessage(err) });
    } finally {
      setSubmittingAccountEdit(false);
    }
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

  return (
    <>
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body">
          <h2 className="card-title">Contas</h2>
          <p className="text-sm text-base-content/70">
            Saldo por conta = histórico completo. Em cartões, &quot;A
            pagar&quot; usa sempre o <strong>mês civil atual</strong>{" "}
            (independente do filtro da lista).
          </p>
          <div
            className={
              accountEdit ? "pointer-events-none opacity-60" : undefined
            }
          >
            <form
              className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2"
              onSubmit={onSubmitAccount}
            >
              <Input
                rootClassName="col-span-full min-[640px]:col-span-2"
                ref={accountFormNameRef}
                label="Nome"
                placeholder="ex.: Bradesco"
                autoComplete="off"
                maxLength={120}
                value={accountForm.name}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, name: e.target.value }))
                }
              />
              <Select
                label="Tipo"
                value={accountForm.type}
                onChange={(e) =>
                  setAccountForm((f) => ({
                    ...f,
                    type: e.target.value as AccountType,
                  }))
                }
              >
                <option value="bank">Banco</option>
                <option value="wallet">Carteira</option>
                <option value="credit_card">Cartão de crédito</option>
                <option value="other">Outro</option>
              </Select>
              <Input
                label="Saldo inicial (opcional)"
                inputMode="decimal"
                placeholder="ex.: 1500 ou −200"
                value={accountForm.openingBalance}
                onChange={(e) =>
                  setAccountForm((f) => ({
                    ...f,
                    openingBalance: e.target.value.replace(",", "."),
                  }))
                }
              />
              <label className="label cursor-pointer justify-start gap-2.5">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={accountForm.makeDefault}
                  onChange={(e) =>
                    setAccountForm((f) => ({
                      ...f,
                      makeDefault: e.target.checked,
                    }))
                  }
                />
                <span className="text-sm">Definir como conta padrão</span>
              </label>
              <div className="col-span-full flex justify-end min-[640px]:col-span-2">
                <button
                  type="submit"
                  disabled={!canSubmitAccount || submittingAccount}
                  className="btn btn-primary"
                >
                  {submittingAccount ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Plus className="size-4" aria-hidden />
                  )}
                  <span>
                    {submittingAccount ? "Salvando…" : "Incluir conta"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {accountEdit ? (
            <form
              className="mt-4 rounded-box border border-base-300 p-4"
              onSubmit={onSubmitAccountEdit}
            >
              <h3 className="mb-2 text-base font-semibold">Editar conta</h3>
              <p className="mb-3 text-sm text-base-content/70">
                Ajuste nome, tipo ou saldo inicial. Deixe o saldo vazio para
                remover o lançamento de saldo inicial.
              </p>
              <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2">
                <Input
                  rootClassName="col-span-full min-[640px]:col-span-2"
                  label="Nome"
                  value={accountEdit.name}
                  onChange={(e) =>
                    setAccountEdit((f) =>
                      f ? { ...f, name: e.target.value } : f,
                    )
                  }
                />
                <Select
                  label="Tipo"
                  value={accountEdit.type}
                  onChange={(e) =>
                    setAccountEdit((f) =>
                      f ? { ...f, type: e.target.value as AccountType } : f,
                    )
                  }
                >
                  <option value="bank">Banco</option>
                  <option value="wallet">Carteira</option>
                  <option value="credit_card">Cartão de crédito</option>
                  <option value="other">Outro</option>
                </Select>
                <Input
                  label="Saldo inicial"
                  inputMode="decimal"
                  placeholder="vazio = sem saldo inicial"
                  value={accountEdit.openingBalance}
                  onChange={(e) =>
                    setAccountEdit((f) =>
                      f
                        ? {
                            ...f,
                            openingBalance: e.target.value.replace(",", "."),
                          }
                        : f,
                    )
                  }
                />
                <Input
                  label="Data do saldo inicial"
                  type="date"
                  value={accountEdit.openingDate}
                  onChange={(e) =>
                    setAccountEdit((f) =>
                      f ? { ...f, openingDate: e.target.value } : f,
                    )
                  }
                />
                <div className="col-span-full flex justify-end gap-2 min-[640px]:col-span-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setAccountEdit(null)}
                  >
                    <X className="size-4" aria-hidden />
                    <span>Voltar</span>
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmitAccountEdit || submittingAccountEdit}
                    className="btn btn-primary"
                  >
                    {submittingAccountEdit ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-4" aria-hidden />
                    )}
                    <span>
                      {submittingAccountEdit ? "Salvando…" : "Salvar"}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          ) : null}
          {accounts.length === 0 ? (
            <div className="py-6 text-center">
              <WalletCards className="mx-auto size-12 opacity-40" aria-hidden />
              <p className="mt-2 font-semibold">Nenhuma conta cadastrada</p>
              <p className="text-base-content/70">
                Crie uma conta (banco, carteira ou cartão) no formulário acima
                para começar a lançar transações.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {accounts.map((a: Account) => (
                <li
                  key={a.id}
                  className="rounded-box border border-base-300 bg-base-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <strong>{a.name}</strong>
                          {a.isDefault ? (
                            <span className="badge badge-outline badge-primary">
                              Padrão
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {a.type === "credit_card" ? (
                        <>
                          <div className="mt-2 text-xs text-base-content/70">
                            Fatura ({faturaMesLabel})
                          </div>
                          <div className="mt-1 text-[15px] font-bold text-warning">
                            A pagar:{" "}
                            {formatCents(
                              creditCardPayableByAccountId[a.id] ?? 0,
                            )}
                          </div>
                          <div className="mt-1 text-xs font-medium text-base-content/70">
                            Saldo (contábil):{" "}
                            {formatCents(balancesByAccountId[a.id] ?? 0)}
                          </div>
                          {payInvoice?.cardId === a.id ? (
                            <form
                              className="mt-3 grid grid-cols-1 gap-3 rounded-box border border-base-300 bg-base-100 p-3"
                              onSubmit={onSubmitPayInvoice}
                            >
                              <Select
                                label="Pagar de"
                                value={payFromId}
                                onChange={(e) => setPayFromId(e.target.value)}
                              >
                                {(accounts.filter(
                                  (x) =>
                                    x.id !== a.id && x.type !== "credit_card",
                                ).length > 0
                                  ? accounts.filter(
                                      (x) =>
                                        x.id !== a.id &&
                                        x.type !== "credit_card",
                                    )
                                  : accounts.filter((x) => x.id !== a.id)
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
                                  setPayAmount(e.target.value.replace(",", "."))
                                }
                              />
                              <Input
                                label="Data"
                                type="date"
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
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
                                    !canSubmitPayInvoice || submittingPayInvoice
                                  }
                                  className="btn btn-primary"
                                >
                                  {submittingPayInvoice ? (
                                    <Loader2
                                      className="size-4 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Check className="size-4" aria-hidden />
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
                              className="btn btn-ghost btn-sm mt-2"
                              onClick={() => openPayInvoice(a.id)}
                            >
                              <CreditCard className="size-4" aria-hidden />
                              <span>Pagar fatura</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <div
                          className={`mt-2 text-sm font-bold ${(balancesByAccountId[a.id] ?? 0) >= 0 ? "text-success" : "text-error"}`}
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
                          onClick={() => {
                            void beginEditAccount(a);
                          }}
                          aria-label={`Editar conta ${a.name}`}
                          title="Editar"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        {!a.isDefault ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square"
                            onClick={() => void handleSetDefaultAccount(a.id)}
                            aria-label="Definir como conta padrão"
                            title="Conta padrão"
                          >
                            <Star className="size-4" aria-hidden />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-outline btn-error btn-sm btn-square"
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
                </li>
              ))}
            </ul>
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
                            <span className="badge badge-outline badge-primary">
                              Padrão
                            </span>
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
                            onClick={() => {
                              void beginEditAccount(a);
                            }}
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
        </div>
      </div>

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

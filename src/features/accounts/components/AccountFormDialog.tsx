/**
 * Modal único para criar e editar contas (incluindo cartões de crédito).
 *
 * Modo «create» — usa `defaultType` para pré-seleccionar o tipo (ex.: o botão
 * «Adicionar cartão» abre o dialog com `defaultType="credit_card"`).
 *
 * Modo «edit» — carrega o saldo inicial actual via
 * `getAccountOpeningForEdit(id)` e permite ajustar nome, tipo, saldo inicial
 * e respectiva data.
 *
 * Em ambos os casos, o título do modal reflecte o tipo (conta vs cartão) para
 * ajudar a leitura.
 */
import { useEffect, useRef, useState } from "react";
import { Check, CreditCard, Loader2, Plus, X } from "lucide-react";
import { Modal } from "../../../shared/components/ui/Modal";
import { Input } from "../../../shared/components/ui/Input";
import { Select } from "../../../shared/components/ui/Select";
import { errMessage } from "../../../shared/utils/error-message";
import { todayISODate } from "../../../shared/lib/dates";
import { useAccountsStore } from "../store/accounts.store";
import type { Account, AccountType } from "../types/accounts";

export type AccountFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  /** Tipo pré-seleccionado quando `mode === "create"`. */
  defaultType: AccountType;
  /** Conta a editar quando `mode === "edit"`; ignorado em criação. */
  editingAccount: Account | null;
  onClose: () => void;
  pushToast: (
    variant: "success" | "error",
    message: string,
    durationMs?: number,
  ) => void;
  setNotice: (n: null | { variant: "error"; message: string }) => void;
};

type FormState = {
  name: string;
  type: AccountType;
  openingBalance: string;
  openingDate: string;
  makeDefault: boolean;
};

function emptyForm(defaultType: AccountType): FormState {
  return {
    name: "",
    type: defaultType,
    openingBalance: "",
    openingDate: todayISODate(),
    makeDefault: false,
  };
}

export function AccountFormDialog({
  open,
  mode,
  defaultType,
  editingAccount,
  onClose,
  pushToast,
  setNotice,
}: AccountFormDialogProps) {
  const addAccount = useAccountsStore((s) => s.addAccount);
  const updateAccountDetails = useAccountsStore(
    (s) => s.updateAccountDetails,
  );
  const getAccountOpeningForEdit = useAccountsStore(
    (s) => s.getAccountOpeningForEdit,
  );

  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(() => emptyForm(defaultType));
  const [submitting, setSubmitting] = useState(false);
  const [loadingOpening, setLoadingOpening] = useState(false);

  // Reinicializa quando abre / muda contexto (criar↔editar, defaultType, conta).
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingAccount) {
      setForm({
        name: editingAccount.name,
        type: editingAccount.type,
        openingBalance: "",
        openingDate: todayISODate(),
        makeDefault: editingAccount.isDefault,
      });
      setLoadingOpening(true);
      getAccountOpeningForEdit(editingAccount.id)
        .then((snap) => {
          setForm((f) => ({
            ...f,
            openingBalance:
              snap.amountCents != null ? String(snap.amountCents / 100) : "",
            openingDate: snap.date,
          }));
        })
        .catch((err) => {
          setNotice({ variant: "error", message: errMessage(err) });
        })
        .finally(() => setLoadingOpening(false));
    } else {
      setForm(emptyForm(defaultType));
    }
    queueMicrotask(() => nameRef.current?.focus());
  }, [open, mode, defaultType, editingAccount, getAccountOpeningForEdit, setNotice]);

  const isCard = form.type === "credit_card";
  const title =
    mode === "edit"
      ? isCard
        ? "Editar cartão"
        : "Editar conta"
      : isCard
        ? "Novo cartão"
        : "Nova conta";

  const openingRaw = form.openingBalance.trim().replace(",", ".");
  const openingValid =
    openingRaw.length === 0 || Number.isFinite(Number(openingRaw));
  const canSubmit = form.name.trim().length > 0 && openingValid;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting || loadingOpening) return;

    setSubmitting(true);
    setNotice(null);
    try {
      if (mode === "edit" && editingAccount) {
        let openingBalanceCents: number | null = null;
        if (openingRaw.length > 0) {
          if (!Number.isFinite(Number(openingRaw))) {
            pushToast("error", "Saldo inicial inválido.");
            return;
          }
          const cents = Math.round(Number(openingRaw) * 100);
          openingBalanceCents = cents === 0 ? null : cents;
        }
        await updateAccountDetails(editingAccount.id, {
          name: form.name.trim(),
          type: form.type,
          openingBalanceCents,
          openingDate: form.openingDate,
        });
        pushToast(
          "success",
          isCard ? "Cartão atualizado." : "Conta atualizada.",
        );
      } else {
        const openingBalanceCents =
          openingRaw.length > 0 && Number.isFinite(Number(openingRaw))
            ? Math.round(Number(openingRaw) * 100)
            : undefined;
        await addAccount({
          name: form.name.trim(),
          type: form.type,
          makeDefault: form.makeDefault,
          openingBalanceCents,
          openingDate:
            openingBalanceCents != null ? form.openingDate : undefined,
        });
        pushToast(
          "success",
          isCard ? "Cartão criado." : "Conta criada.",
        );
      }
      onClose();
    } catch (err) {
      setNotice({ variant: "error", message: errMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <form
        className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2"
        onSubmit={onSubmit}
      >
        <Input
          rootClassName="col-span-full min-[640px]:col-span-2"
          ref={nameRef}
          label="Nome"
          placeholder={isCard ? "ex.: Nubank" : "ex.: Bradesco"}
          autoComplete="off"
          maxLength={120}
          value={form.name}
          onChange={(e) =>
            setForm((f) => ({ ...f, name: e.target.value }))
          }
        />

        <Select
          label="Tipo"
          value={form.type}
          onChange={(e) =>
            setForm((f) => ({
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
          label={
            mode === "edit"
              ? "Saldo inicial"
              : "Saldo inicial (opcional)"
          }
          inputMode="decimal"
          placeholder={
            mode === "edit"
              ? "vazio = sem saldo inicial"
              : "ex.: 1500 ou −200"
          }
          disabled={loadingOpening}
          value={form.openingBalance}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              openingBalance: e.target.value.replace(",", "."),
            }))
          }
        />

        {mode === "edit" ? (
          <Input
            label="Data do saldo inicial"
            type="date"
            disabled={loadingOpening}
            value={form.openingDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, openingDate: e.target.value }))
            }
          />
        ) : (
          <label className="label flex cursor-pointer items-center justify-start gap-2.5">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={form.makeDefault}
              onChange={(e) =>
                setForm((f) => ({ ...f, makeDefault: e.target.checked }))
              }
            />
            <span className="text-sm">Definir como conta padrão</span>
          </label>
        )}

        <div className="modal-action col-span-full flex flex-col-reverse gap-2 min-[640px]:col-span-2 min-[640px]:flex-row min-[640px]:justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <X className="size-4" aria-hidden />
            <span>Voltar</span>
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting || loadingOpening}
            className="btn btn-primary"
          >
            {submitting || loadingOpening ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : mode === "edit" ? (
              <Check className="size-4" aria-hidden />
            ) : isCard ? (
              <CreditCard className="size-4" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            <span>
              {submitting
                ? "Salvando…"
                : mode === "edit"
                  ? "Salvar"
                  : isCard
                    ? "Incluir cartão"
                    : "Incluir conta"}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

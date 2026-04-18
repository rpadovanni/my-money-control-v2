import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { todayISODate } from "../../../shared/lib/dates";
import { errMessage } from "../../../shared/utils/money-format";
import { Input } from "../../../shared/components/ui/Input";
import { Select } from "../../../shared/components/ui/Select";
import { useTransactionsStore } from "../store/transactions.store";
import type { TransactionType } from "../types/transactions";

export type TxFormAccountOption = {
  id: string;
  name: string;
  isDefault: boolean;
  type: string;
};

export type TxFormCategoryOption = {
  id: string;
  label: string;
  system?: boolean;
};

export function TransactionFormCard({
  accounts,
  archivedAccounts,
  categories,
  categoriesReady,
  pushToast,
  setNotice,
  editingId,
  setEditingId,
  submittingTx,
  setSubmittingTx,
}: {
  accounts: TxFormAccountOption[];
  archivedAccounts: Array<{ id: string; name: string }>;
  categories: TxFormCategoryOption[];
  categoriesReady: boolean;
  pushToast: (
    variant: "success" | "error",
    message: string,
    durationMs?: number,
  ) => void;
  setNotice: (n: null | { variant: "error"; message: string }) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  submittingTx: boolean;
  setSubmittingTx: (v: boolean) => void;
}) {
  const rows = useTransactionsStore((s) => s.transactions.items);
  const add = useTransactionsStore((s) => s.addTransaction);
  const update = useTransactionsStore((s) => s.updateTransaction);

  const txFormAmountRef = useRef<HTMLInputElement>(null);

  const editing = useMemo(
    () => rows.find((t) => t.id === editingId) ?? null,
    [editingId, rows],
  );

  const defaultAccountId = useMemo(() => {
    const d = accounts.find((a) => a.isDefault);
    return d?.id ?? accounts[0]?.id ?? "";
  }, [accounts]);

  const [form, setForm] = useState(() => ({
    type: "expense" as TransactionType,
    accountId: "",
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    date: todayISODate(),
    category: "other" as string,
    description: "",
  }));

  function accountName(id: string) {
    return (
      accounts.find((a) => a.id === id)?.name ??
      archivedAccounts.find((a) => a.id === id)?.name ??
      id
    );
  }

  useEffect(() => {
    if (!categoriesReady || categories.length === 0) return;
    const ids = new Set(categories.map((c) => c.id));
    if (form.type === "transfer") return;
    if (!ids.has(form.category)) {
      const fallback =
        (ids.has("other")
          ? "other"
          : categories.find((c) => c.id !== "transfer")?.id) ?? form.category;
      setForm((f) => ({ ...f, category: fallback }));
    }
  }, [categoriesReady, categories, form.category, form.type]);

  useEffect(() => {
    if (defaultAccountId && !form.accountId) {
      setForm((f) => ({ ...f, accountId: defaultAccountId }));
    }
  }, [defaultAccountId, form.accountId]);

  useEffect(() => {
    if (!editing) return;
    if (editing.kind === "opening_balance") {
      setForm({
        type: "income",
        accountId: editing.accountId,
        fromAccountId: "",
        toAccountId: "",
        amount: String(editing.amountCents / 100),
        date: editing.date,
        category: editing.category,
        description: editing.description ?? "",
      });
      return;
    }
    if (editing.type === "transfer") {
      setForm({
        type: "transfer",
        accountId: "",
        fromAccountId: editing.fromAccountId ?? "",
        toAccountId: editing.toAccountId ?? "",
        amount: String(editing.amountCents / 100),
        date: editing.date,
        category: "transfer",
        description: editing.description ?? "",
      });
      return;
    }
    setForm({
      type: editing.type,
      accountId: editing.accountId,
      fromAccountId: "",
      toAccountId: "",
      amount: String(editing.amountCents / 100),
      date: editing.date,
      category: editing.category,
      description: editing.description ?? "",
    });
  }, [editing]);

  const amountRaw = form.amount.trim().replace(",", ".");
  const amountNum = amountRaw.length > 0 ? Number(amountRaw) : Number.NaN;
  const amountOk = form.amount.trim().length > 0 && Number.isFinite(amountNum);

  const canSubmit =
    editing?.kind === "opening_balance"
      ? amountOk && amountNum !== 0
      : form.type === "transfer"
        ? amountOk &&
          amountNum > 0 &&
          Boolean(form.fromAccountId) &&
          Boolean(form.toAccountId) &&
          form.fromAccountId !== form.toAccountId
        : amountOk && amountNum > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submittingTx) return;

    setSubmittingTx(true);
    setNotice(null);
    try {
      if (editing?.kind === "opening_balance") {
        const amountCents = Math.round(amountNum * 100);
        if (amountCents === 0) return;
        await update(editing.id, {
          amountCents,
          date: form.date,
          description: form.description.trim() || undefined,
        });
        setEditingId(null);
        setForm((f) => ({
          ...f,
          amount: "",
          description: "",
          date: todayISODate(),
        }));
        pushToast("success", "Saldo inicial atualizado.");
        queueMicrotask(() => txFormAmountRef.current?.focus());
        return;
      }

      if (form.type === "transfer") {
        const amountCents = Math.round(amountNum * 100);
        if (amountCents <= 0) return;
        const desc = form.description.trim() || undefined;
        if (editing?.type === "transfer") {
          await update(editing.id, {
            type: "transfer",
            fromAccountId: form.fromAccountId,
            toAccountId: form.toAccountId,
            amountCents,
            date: form.date,
            category: "transfer",
            description: desc,
          });
          setEditingId(null);
          pushToast("success", "Transferência atualizada.");
        } else {
          await add({
            type: "transfer",
            fromAccountId: form.fromAccountId,
            toAccountId: form.toAccountId,
            amountCents,
            date: form.date,
            category: "transfer",
            description: desc,
          });
          pushToast("success", "Transferência registrada.");
        }
        setForm((f) => ({
          ...f,
          type: "expense",
          fromAccountId: defaultAccountId,
          toAccountId: "",
          accountId: f.accountId || defaultAccountId,
          category: "other",
          amount: "",
          description: "",
          date: todayISODate(),
        }));
        queueMicrotask(() => txFormAmountRef.current?.focus());
        return;
      }

      const amountCents = Math.round(amountNum * 100);
      if (amountCents <= 0) return;

      const accountId = form.accountId || defaultAccountId;
      if (!accountId) {
        pushToast("error", "Selecione uma conta.");
        return;
      }

      const desc = form.description.trim() || undefined;
      if (editing) {
        await update(editing.id, {
          type: form.type,
          accountId,
          amountCents,
          date: form.date,
          category: form.category,
          description: desc,
        });
        setEditingId(null);
        pushToast("success", "Transação atualizada.");
      } else {
        await add({
          type: form.type,
          accountId,
          amountCents,
          date: form.date,
          category: form.category,
          description: desc,
        });
        pushToast("success", "Transação adicionada.");
      }

      setForm((f) => ({
        ...f,
        amount: "",
        description: "",
        date: todayISODate(),
      }));
      queueMicrotask(() => txFormAmountRef.current?.focus());
    } catch (err) {
      setNotice({ variant: "error", message: errMessage(err) });
    } finally {
      setSubmittingTx(false);
    }
  }

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body">
      <h2 className="card-title">
        {editing
          ? editing.kind === "opening_balance"
            ? "Saldo inicial"
            : editing.type === "transfer"
              ? "Editar transferência"
              : "Editar transação"
          : "Nova transação"}
      </h2>
      <form className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2" onSubmit={onSubmit}>
        {editing?.kind !== "opening_balance" ? (
          <Select
            label="Tipo"
            value={form.type}
            disabled={Boolean(editing)}
            onChange={(e) => {
              const t = e.target.value as TransactionType;
              setForm((f) => ({
                ...f,
                type: t,
                fromAccountId: t === "transfer" ? f.fromAccountId || defaultAccountId : "",
                toAccountId: t === "transfer" ? f.toAccountId : "",
                accountId: t !== "transfer" ? f.accountId || defaultAccountId : f.accountId,
                category: t === "transfer" ? "transfer" : f.category === "transfer" ? "other" : f.category,
              }));
            }}
          >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
              <option value="transfer">Transferência</option>
          </Select>
        ) : null}

        <Input
          ref={txFormAmountRef}
          label="Valor (R$)"
          inputMode="decimal"
          autoComplete="off"
          maxLength={24}
          placeholder={editing?.kind === "opening_balance" ? "pode ser negativo" : "ex.: 25,90"}
          title="Use ponto ou vírgula para centavos"
          value={form.amount}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              amount: e.target.value.replace(",", ".").replace(/[^\d.-]/g, ""),
            }))
          }
        />

        <Input
          label="Data"
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />

        {editing?.kind !== "opening_balance" && form.type === "transfer" ? (
          <>
            <Select
              label="De (origem)"
              value={form.fromAccountId || defaultAccountId}
              onChange={(e) => setForm((f) => ({ ...f, fromAccountId: e.target.value }))}
            >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
            <Select
              label="Para (destino)"
              value={form.toAccountId}
              onChange={(e) => setForm((f) => ({ ...f, toAccountId: e.target.value }))}
            >
                <option value="">Selecione…</option>
                {accounts
                  .filter(
                    (a) => a.id !== (form.fromAccountId || defaultAccountId),
                  )
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
            </Select>
          </>
        ) : null}

        {editing?.kind !== "opening_balance" && form.type !== "transfer" ? (
          <>
            <Select
              label="Conta"
              value={form.accountId || defaultAccountId}
              onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
            >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>

            <Select
              label="Categoria"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
                {categories
                  .filter((c) => c.id !== "transfer")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
            </Select>
          </>
        ) : null}

        {editing?.kind === "opening_balance" ? (
          <Input
            rootClassName="col-span-full min-[640px]:col-span-2"
            label="Conta"
            readOnly
            value={accountName(editing.accountId)}
          />
        ) : null}

        <Input
          rootClassName="col-span-full min-[640px]:col-span-2"
          label="Descrição (opcional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />

        <div className="col-span-full flex justify-end gap-2 min-[640px]:col-span-2">
          {editing ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditingId(null)}
              >
                <X className="size-4" aria-hidden />
                <span>Voltar</span>
              </button>
              <button
                type="submit"
                disabled={!canSubmit || submittingTx}
                className="btn btn-primary"
              >
                {submittingTx ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="size-4" aria-hidden />
                )}
                <span>{submittingTx ? "Salvando…" : "Salvar"}</span>
              </button>
            </>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit || submittingTx}
              className="btn btn-primary"
            >
              {submittingTx ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              <span>{submittingTx ? "Salvando…" : "Incluir"}</span>
            </button>
          )}
        </div>
      </form>
      </div>
    </div>
  );
}

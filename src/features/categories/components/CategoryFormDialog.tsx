/**
 * Modal único para criar e editar categorias.
 *
 * Modo «create» — campo de nome vazio; o submit chama `addCategory(label, type)`.
 * Modo «edit» — pré-preenche com o nome actual; o submit chama
 * `updateCategory(id, label, type)`.
 *
 * O título e o rótulo do botão primário ajustam-se conforme o modo.
 */
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Modal } from "../../../shared/components/ui/Modal";
import { Input } from "../../../shared/components/ui/Input";
import { Select } from "../../../shared/components/ui/Select";
import { errMessage } from "../../../shared/utils/error-message";
import { useCategoriesStore } from "../store/categories.store";
import type { CategoryType } from "../types/category";

export type EditingCategory = { id: string; label: string; type: CategoryType };

export type CategoryFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  /** Categoria a editar quando `mode === "edit"`; ignorado em criação. */
  editingCategory: EditingCategory | null;
  onClose: () => void;
  pushToast: (
    variant: "success" | "error",
    message: string,
    durationMs?: number,
  ) => void;
};

export function CategoryFormDialog({
  open,
  mode,
  editingCategory,
  onClose,
  pushToast,
}: CategoryFormDialogProps) {
  const addCategory = useCategoriesStore((s) => s.addCategory);
  const updateCategory = useCategoriesStore((s) => s.updateCategory);

  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const initialLabel =
    mode === "edit" && editingCategory ? editingCategory.label : "";
  const initialType =
    mode === "edit" && editingCategory ? editingCategory.type : "expense";
  const initialKey = `${open}:${mode}:${editingCategory?.id ?? "new"}:${initialLabel}:${initialType}`;
  const [externalKey, setExternalKey] = useState(initialKey);
  const [submitting, setSubmitting] = useState(false);

  if (externalKey !== initialKey) {
    setExternalKey(initialKey);
    setLabel(initialLabel);
    setType(initialType);
  }

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => inputRef.current?.focus());
  }, [open]);

  const trimmed = label.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === "edit" && editingCategory) {
        await updateCategory(editingCategory.id, trimmed, type);
        pushToast("success", "Categoria atualizada.");
      } else {
        await addCategory(trimmed, type);
        pushToast("success", "Categoria criada.");
      }
      onClose();
    } catch (err) {
      pushToast("error", errMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === "edit" ? "Editar categoria" : "Nova categoria";

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <form
        className="grid grid-cols-1 gap-3"
        onSubmit={(e) => void onSubmit(e)}
      >
        <Input
          ref={inputRef}
          label="Nome"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="ex.: Ajuste"
          maxLength={80}
          autoComplete="off"
        />

        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value as CategoryType)}
        >
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </Select>

        <div className="modal-action flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <X className="size-4" aria-hidden />
            <span>Voltar</span>
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn btn-primary"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : mode === "edit" ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            <span>
              {submitting
                ? "Salvando…"
                : mode === "edit"
                  ? "Salvar"
                  : "Incluir"}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

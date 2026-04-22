/**
 * Modal único para criar e editar categorias.
 *
 * Modo «create» — campo de nome vazio; o submit chama `addCategory(label)`.
 * Modo «edit» — pré-preenche com o nome actual; o submit chama
 * `updateCategory(id, label)`.
 *
 * O título e o rótulo do botão primário ajustam-se conforme o modo.
 */
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Modal } from "../../../shared/components/ui/Modal";
import { Input } from "../../../shared/components/ui/Input";
import { errMessage } from "../../../shared/utils/error-message";
import { useCategoriesStore } from "../store/categories.store";

export type EditingCategory = { id: string; label: string };

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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(mode === "edit" && editingCategory ? editingCategory.label : "");
    queueMicrotask(() => inputRef.current?.focus());
  }, [open, mode, editingCategory]);

  const trimmed = label.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === "edit" && editingCategory) {
        await updateCategory(editingCategory.id, trimmed);
        pushToast("success", "Categoria atualizada.");
      } else {
        await addCategory(trimmed);
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

        <div className="modal-action flex justify-end gap-2">
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

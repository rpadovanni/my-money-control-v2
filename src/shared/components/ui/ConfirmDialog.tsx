/**
 * Modal de confirmação acessível usando o elemento nativo `<dialog>` com as
 * classes `modal` do DaisyUI.
 *
 * O browser trata automaticamente: focus-trap, ESC para fechar, scroll-lock,
 * `aria-modal`, `backdrop` e restauração de foco — sem reimplementação manual.
 *
 * É um componente "dumb": mostra/oculta conforme {@link open}; quem chama
 * decide a ação primária via `onConfirm`.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Trash2, X } from "lucide-react";
import { cn } from "../../utils/cn";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Texto do botão primário (default: «Confirmar»). */
  confirmLabel?: string;
  /** Texto do botão secundário (default: «Voltar»). */
  cancelLabel?: string;
  /** Variante visual do botão primário. */
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  /** Ícone à esquerda do label primário. Default: lixeira para `danger`. */
  confirmIcon?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  variant = "primary",
  onConfirm,
  onCancel,
  confirmIcon,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  // Fechar ao clicar no backdrop (área fora da caixa de diálogo).
  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const clickedInsideBox =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!clickedInsideBox) onCancel();
  }

  // ESC nativo chama `close()`, mas não chama `onCancel` — precisamos sincronizar.
  function onDialogClose() {
    if (open) onCancel();
  }

  const primaryClass = cn(
    "btn",
    variant === "danger" ? "btn-outline btn-error" : "btn-primary",
  );
  const defaultConfirmIcon =
    variant === "danger" ? (
      <Trash2 className="size-4" aria-hidden />
    ) : null;

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={onDialogClick}
      onClose={onDialogClose}
    >
      <div className="modal-box w-full max-w-[420px]">
        <h2 id={titleId} className="mb-2.5 mt-0 text-lg font-bold">
          {title}
        </h2>
        {description ? (
          <div id={descId} className="mb-4 mt-0 text-sm text-base-content/70">
            {description}
          </div>
        ) : null}
        <div className="modal-action flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            <X className="size-4" aria-hidden />
            <span>{cancelLabel}</span>
          </button>
          <button type="button" className={primaryClass} onClick={onConfirm}>
            {confirmIcon ?? defaultConfirmIcon}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}

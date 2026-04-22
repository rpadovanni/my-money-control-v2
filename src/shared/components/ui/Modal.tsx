/**
 * Modal genérico acessível, baseado no elemento nativo `<dialog>` com classes
 * `modal` do DaisyUI.
 *
 * O browser trata focus-trap, ESC, scroll-lock, `aria-modal`, backdrop e
 * restauração de foco. Sincronizamos:
 *  - `open=true/false` ↔ `dialog.showModal()/close()`
 *  - clique fora da caixa → `onClose()`
 *  - ESC nativo (que chama `close()`) → `onClose()` via evento `close`
 *
 * É um componente de chrome: o conteúdo (formulários, botões de ação)
 * vai em `children`. Espera-se que o consumidor inclua os próprios botões
 * (Salvar / Voltar) — normalmente dentro de um `<form>`.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

export type ModalSize = "sm" | "md" | "lg";

export type ModalProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** Conteúdo do modal — tipicamente um `<form>` com botões próprios. */
  children: ReactNode;
  onClose: () => void;
  /** Largura máxima da caixa. Default: `md` (≈ 540px). */
  size?: ModalSize;
  /** Mostrar botão de fechar (×) no canto. Default: true. */
  showCloseButton?: boolean;
  /** Classe adicional para o `modal-box`. */
  boxClassName?: string;
};

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[540px]",
  lg: "max-w-[760px]",
};

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  size = "md",
  showCloseButton = true,
  boxClassName,
}: ModalProps) {
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

  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const clickedInsideBox =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!clickedInsideBox) onClose();
  }

  function onDialogClose() {
    if (open) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={onDialogClick}
      onClose={onDialogClose}
    >
      <div className={cn("modal-box w-full", SIZE_CLASS[size], boxClassName)}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="m-0 text-lg font-bold leading-tight text-base-content"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descId}
                className="mt-1 text-sm text-base-content/70"
              >
                {description}
              </p>
            ) : null}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square -mr-2 -mt-1"
              aria-label="Fechar"
              onClick={onClose}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </dialog>
  );
}

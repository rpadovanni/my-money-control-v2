/**
 * Menu «kebab» (três pontos verticais) para esconder acções secundárias e
 * libertar espaço em listas / linhas. Usa o padrão **CSS focus** do DaisyUI:
 * o `dropdown-content` aparece enquanto algum elemento interno está focado;
 * basta o utilizador clicar fora ou nós dispararmos `blur()` para fechar.
 *
 * Uso:
 * ```tsx
 * <KebabMenu ariaLabel="Ações da linha">
 *   <KebabMenuItem
 *     icon={<Pencil className="size-4" aria-hidden />}
 *     label="Editar"
 *     onSelect={onEdit}
 *   />
 *   <KebabMenuItem
 *     icon={<Trash2 className="size-4" aria-hidden />}
 *     label="Excluir"
 *     variant="danger"
 *     onSelect={onDelete}
 *   />
 * </KebabMenu>
 * ```
 */
import type { ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "../../utils/cn";

export type KebabMenuProps = {
  /** Rótulo acessível do botão (obrigatório, o ícone é decorativo). */
  ariaLabel: string;
  /** Alinhamento do painel relativo ao botão. */
  align?: "start" | "end";
  /** Tamanho do botão (segue `btn-sm` / `btn-md` do DaisyUI). */
  size?: "sm" | "md";
  /** `KebabMenuItem`s. */
  children: ReactNode;
  className?: string;
};

export function KebabMenu({
  ariaLabel,
  align = "end",
  size = "sm",
  children,
  className,
}: KebabMenuProps) {
  return (
    <div
      className={cn(
        "dropdown",
        align === "end" && "dropdown-end",
        className,
      )}
    >
      <div
        tabIndex={0}
        role="button"
        aria-label={ariaLabel}
        className={cn(
          "btn btn-ghost btn-square text-base-content/60 hover:text-base-content",
          size === "sm" ? "btn-sm" : "btn-md",
        )}
      >
        <MoreVertical className="size-4" aria-hidden />
      </div>
      <ul
        tabIndex={-1}
        className="dropdown-content menu z-40 mt-1 min-w-40 rounded-box border border-base-200 bg-base-100 p-2 shadow-lg"
      >
        {children}
      </ul>
    </div>
  );
}

export type KebabMenuItemProps = {
  icon?: ReactNode;
  label: string;
  onSelect: () => void;
  /** `danger` aplica cor de erro ao texto / hover. */
  variant?: "default" | "danger";
  disabled?: boolean;
};

export function KebabMenuItem({
  icon,
  label,
  onSelect,
  variant = "default",
  disabled,
}: KebabMenuItemProps) {
  function handleClick() {
    if (disabled) return;
    onSelect();
    // Padrão CSS focus do DaisyUI: tirar o foco do interior do `.dropdown`
    // fecha o painel. Cobre os casos em que o browser mantém foco no botão.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  return (
    <li className={cn(disabled && "disabled")}>
      <button
        type="button"
        className={cn(
          "gap-2",
          variant === "danger" && "text-error hover:bg-error/10",
        )}
        onClick={handleClick}
        disabled={disabled}
      >
        {icon}
        <span>{label}</span>
      </button>
    </li>
  );
}

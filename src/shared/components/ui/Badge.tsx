/**
 * Badge estilo [daisyUI](https://daisyui.com/components/badge/) com variantes de
 * estilo, cor e tamanho mapeadas para classes Tailwind.
 *
 * Conteúdo: passa `children`, ou então `icon` / `label` (ou só um dos dois).
 */
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";

// --- Estilo (outline, soft, …) ---
const badgeStyles = {
  outline: "badge-outline",
  dash: "badge-dash",
  soft: "badge-soft",
  ghost: "badge-ghost",
} as const;

export type BadgeVariant = keyof typeof badgeStyles;

// --- Cor semântica (tema) ---
const badgeColors = {
  neutral: "badge-neutral",
  primary: "badge-primary",
  secondary: "badge-secondary",
  accent: "badge-accent",
  info: "badge-info",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
} as const;

export type BadgeColor = keyof typeof badgeColors;

// --- Tamanho ---
const badgeSizes = {
  xs: "badge-xs",
  sm: "badge-sm",
  md: "badge-md",
  lg: "badge-lg",
  xl: "badge-xl",
} as const;

export type BadgeSize = keyof typeof badgeSizes;

export type BadgeProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  children?: ReactNode;
  variant?: BadgeVariant;
  color?: BadgeColor;
  size?: BadgeSize;
  /** Usado com `label` quando não há `children`. */
  icon?: ReactNode;
  /** Usado com `icon` quando não há `children`. */
  label?: string;
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, color, size, icon, label, children, ...props },
  ref,
) {
  const content =
    children ??
    (
      <>
        {icon}
        {label}
      </>
    );

  return (
    <span
      ref={ref}
      className={cn(
        "badge",
        variant ? badgeStyles[variant] : undefined,
        color ? badgeColors[color] : undefined,
        size ? badgeSizes[size] : undefined,
        className,
      )}
      {...props}
    >
      {content}
    </span>
  );
});

Badge.displayName = "Badge";

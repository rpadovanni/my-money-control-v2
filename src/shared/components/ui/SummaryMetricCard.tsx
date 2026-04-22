/**
 * Cartão de métrica (DaisyUI `card`): ícone, label, valor, ação no canto e
 * rodapé opcional (ex. texto ou barra de progresso).
 */
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../../utils/cn";

export type SummaryMetricCardProps = Omit<
  ComponentPropsWithoutRef<"article">,
  "children"
> & {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
};

export function SummaryMetricCard({
  icon,
  label,
  value,
  headerAction,
  footer,
  className,
  ...props
}: SummaryMetricCardProps) {
  return (
    <article
      className={cn("card border border-base-300 bg-base-100", className)}
      {...props}
    >
      <div className="card-body flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
            {icon}
          </div>
          {headerAction ? (
            <div className="flex shrink-0 items-center text-base-content/50 [&_svg]:size-4">
              {headerAction}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <div className="text-sm text-base-content/60">{label}</div>
          <div className="text-2xl font-bold text-base-content">{value}</div>
        </div>

        {footer ? <div className="min-w-0">{footer}</div> : null}
      </div>
    </article>
  );
}

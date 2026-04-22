/**
 * Linha compacta de uma transação na lista: ícone circular, título, categoria •
 * data, valor (ou texto override, ex.: transferências) e um slot opcional para
 * ações (editar / excluir).
 */
import type { ReactNode } from "react";
import { cn } from "../../../shared/utils/cn";
import { signedFormatCents } from "../../../shared/utils/money-format";
import { TransactionListRowIcon } from "./TransactionListRowIcon";
import type { TransactionRowIconKind } from "../utils/transaction-row-icon";

export type TransactionListRowProps = {
  /** Nome do estabelecimento / título principal. */
  title: string;
  /** Categoria (primeira parte da linha secundária). */
  category: string;
  /** Data ou rótulo temporal (segunda parte, após "•"). */
  dateLabel: string;
  /** Valor em centavos; ignorado na exibição se {@link amountTextOverride} estiver definido. */
  amountCents: number;
  /**
   * Texto do valor já pronto (ex.: transferência `↔ R$ …`).
   * Caso contrário, usa {@link signedFormatCents}.
   */
  amountTextOverride?: string;
  /** Chave do ícone (ex.: `"shopping-cart"`). */
  iconKind: TransactionRowIconKind;
  /** Slot opcional à direita do valor (ex.: botões de editar/excluir). */
  actions?: ReactNode;
  className?: string;
};

// Classes do container circular do ícone, derivadas da mesma lógica de cor do
// valor: verde para receita, vermelho para despesa, neutro para transferência.
// Usa opacidade /15 para que o fundo seja um tint suave do token semântico.
function iconContainerClass(
  amountCents: number,
  amountTextOverride?: string,
): string {
  if (amountTextOverride) return "bg-base-200 text-base-content/60";
  if (amountCents >= 0) return "bg-success/15 text-success";
  return "bg-error/15 text-error";
}

export function TransactionListRow({
  title,
  category,
  dateLabel,
  amountCents,
  amountTextOverride,
  iconKind,
  actions,
  className,
}: TransactionListRowProps) {
  const amountLabel = amountTextOverride ?? signedFormatCents(amountCents);

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-2 py-3 sm:px-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            iconContainerClass(amountCents, amountTextOverride),
          )}
          aria-hidden
        >
          <TransactionListRowIcon kind={iconKind} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight text-base-content">
            {title}
          </p>
          <p className="mt-0.5 truncate text-[13px] leading-tight text-base-content/60">
            {category} • {dateLabel}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p
          className={cn(
            "m-0 text-right text-base font-semibold leading-tight tabular-nums",
            amountTextOverride
              ? "text-base-content"
              : amountCents >= 0
                ? "text-success"
                : "text-error",
          )}
        >
          {amountLabel}
        </p>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
    </div>
  );
}

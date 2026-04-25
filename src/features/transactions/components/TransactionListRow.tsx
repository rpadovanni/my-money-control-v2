/**
 * Linha compacta de uma transação na lista: ícone circular, título, metadados
 * (categoria • conta • data), valor (ou texto override, ex.: transferências) e
 * um slot opcional para ações (editar / excluir).
 */
import type { ReactNode } from "react";
import { Calendar, Landmark } from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import { signedFormatCents } from "../../../shared/utils/money-format";
import { TransactionListRowIcon } from "./TransactionListRowIcon";
import type { TransactionRowIconKind } from "../utils/transaction-row-icon";

export type TransactionListRowProps = {
  /** Nome do estabelecimento / título principal. */
  title: string;
  /** Categoria da transação. */
  category: string;
  /** Conta da transação ou, em transferências, origem → destino. */
  accountLabel: string;
  /** Data ou rótulo temporal. */
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
  accountLabel,
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
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-2 py-3 sm:px-3",
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
          <div className="mt-1 flex min-w-0 flex-col gap-1 text-[13px] leading-tight text-base-content/60 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
            <MetaItem>
              <TransactionListRowIcon kind={iconKind} className="size-3.5" />
              <span className="truncate">{category}</span>
            </MetaItem>
            <MetaSeparator />
            <MetaItem>
              <Landmark className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{accountLabel}</span>
            </MetaItem>
            <MetaSeparator />
            <MetaItem>
              <Calendar className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{dateLabel}</span>
            </MetaItem>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-start gap-1 sm:gap-2">
        <p
          className={cn(
            "m-0 whitespace-nowrap text-right text-sm font-semibold leading-tight tabular-nums min-[420px]:text-base",
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

function MetaItem({ children }: { children: ReactNode }) {
  return (
    <span className="flex min-w-0 max-w-full items-center gap-1 sm:max-w-56">
      {children}
    </span>
  );
}

function MetaSeparator() {
  return (
    <span className="hidden sm:inline" aria-hidden>
      •
    </span>
  );
}

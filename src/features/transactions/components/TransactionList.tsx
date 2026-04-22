/**
 * Lista de transações estilo fintech: cabeçalho com título, link opcional «Ver
 * todas», estado vazio e linhas separadas por divider do tema.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../../shared/utils/cn";
import {
  TransactionListRow,
  type TransactionListRowProps,
} from "./TransactionListRow";

/** Item de lista (id estável + dados da linha + ações opcionais). */
export type TransactionListItem = Omit<TransactionListRowProps, "className"> & {
  id: string;
};

export type TransactionListProps = {
  items: TransactionListItem[];
  /** Título do bloco (default: «Transações Recentes»). */
  title?: string;
  /** Texto do link «Ver todas» (default). Só aparece com `seeAllHref`. */
  seeAllLabel?: string;
  /** Rota interna para «Ver todas» (usa `Link` do React Router). */
  seeAllHref?: string;
  /** Conteúdo quando `items` está vazio (ex. estado vazio da lista). */
  emptySlot?: ReactNode;
  className?: string;
};

const DEFAULT_TITLE = "Transações Recentes";
const DEFAULT_SEE_ALL_LABEL = "Ver todas";

export function TransactionList({
  items,
  title = DEFAULT_TITLE,
  seeAllLabel = DEFAULT_SEE_ALL_LABEL,
  seeAllHref,
  emptySlot,
  className,
}: TransactionListProps) {
  return (
    <section
      className={cn(
        "w-full rounded-box border border-base-300 bg-base-100 p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="m-0 text-lg font-semibold leading-tight text-base-content">
          {title}
        </h2>
        {seeAllHref ? (
          <Link to={seeAllHref} className="link link-hover shrink-0 text-sm">
            {seeAllLabel}
          </Link>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ul className="mt-2 divide-y divide-base-200">
          {items.map((item) => {
            const { id, ...rowProps } = item;
            return (
              <li key={id}>
                <TransactionListRow {...rowProps} />
              </li>
            );
          })}
        </ul>
      ) : emptySlot ? (
        <div className="mt-4 border-t border-base-200 px-2 py-8 text-center sm:px-4">
          {emptySlot}
        </div>
      ) : null}
    </section>
  );
}

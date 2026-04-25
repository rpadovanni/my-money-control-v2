/**
 * Ícone Lucide por chave (`TransactionRowIconKind`), usado na lista de
 * transações. Cor/tamanho ajustáveis por `className`.
 */
import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Film,
  Fuel,
  GraduationCap,
  HeartPulse,
  type LucideIcon,
  Plane,
  Receipt,
  ShoppingCart,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
} from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import type { TransactionRowIconKind } from "../utils/transaction-row-icon";

const ICON_BY_KIND: Record<TransactionRowIconKind, LucideIcon> = {
  wallet: Wallet,
  "arrow-left-right": ArrowLeftRight,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  fuel: Fuel,
  receipt: Receipt,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  film: Film,
  plane: Plane,
  banknote: Banknote,
  briefcase: Briefcase,
  "trending-up": TrendingUp,
  tag: Tag,
};

export type TransactionListRowIconProps = {
  kind: TransactionRowIconKind;
  /**
   * Classes extras do SVG (tamanho, cor…). Omitir para herdar a cor do container
   * pai via `currentColor` — o padrão mais correto quando o container já
   * declara `text-*`.
   */
  className?: string;
};

export function TransactionListRowIcon({
  kind,
  className,
}: TransactionListRowIconProps) {
  const Icon = ICON_BY_KIND[kind] ?? Tag;
  return (
    <Icon
      className={cn("size-5 shrink-0", className)}
      aria-hidden
    />
  );
}

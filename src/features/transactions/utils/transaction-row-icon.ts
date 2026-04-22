/**
 * Mapeia uma transação para a chave do ícone visual da linha (consumida pelo
 * `TransactionListRowIcon`). Função pura, partilhada entre lista e workspace.
 */
import type { Transaction } from "../../../domain/transactions/types";

export type TransactionRowIconKind =
  | "wallet"
  | "arrow-left-right"
  | "shopping-cart"
  | "utensils"
  | "fuel"
  | "receipt"
  | "heart-pulse"
  | "graduation-cap"
  | "film"
  | "plane"
  | "banknote"
  | "briefcase"
  | "tag"
  | "trending-up";

const CATEGORY_ICON: Record<string, TransactionRowIconKind> = {
  food: "utensils",
  transport: "fuel",
  shopping: "shopping-cart",
  bills: "receipt",
  health: "heart-pulse",
  education: "graduation-cap",
  entertainment: "film",
  travel: "plane",
  salary: "briefcase",
  freelance: "banknote",
  transfer: "arrow-left-right",
};

export function iconKindForTransaction(t: Transaction): TransactionRowIconKind {
  if (t.kind === "opening_balance") return "wallet";
  if (t.type === "transfer") return "arrow-left-right";
  if (t.type === "income") return "trending-up";
  return CATEGORY_ICON[t.category] ?? "tag";
}

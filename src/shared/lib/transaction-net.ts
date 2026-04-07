import type { Transaction } from '../store/types/transactions'

/** Contribuição de uma transação para o saldo da conta (regra única no app). */
export function transactionNetCents(t: Transaction): number {
  if (t.kind === 'opening_balance') return t.amountCents
  return t.type === 'income' ? t.amountCents : -t.amountCents
}

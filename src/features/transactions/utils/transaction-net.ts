import type { Transaction } from '../types/transactions'

/** Efeito no saldo de cada conta (mapa agregado). */
export function applyTransactionToBalanceMap(t: Transaction, out: Record<string, number>): void {
  if (t.type === 'transfer' && t.fromAccountId && t.toAccountId) {
    const amt = t.amountCents
    out[t.fromAccountId] = (out[t.fromAccountId] ?? 0) - amt
    out[t.toAccountId] = (out[t.toAccountId] ?? 0) + amt
    return
  }
  if (t.kind === 'opening_balance') {
    out[t.accountId] = (out[t.accountId] ?? 0) + t.amountCents
    return
  }
  const id = t.accountId
  if (t.type === 'income') out[id] = (out[id] ?? 0) + t.amountCents
  else if (t.type === 'expense') out[id] = (out[id] ?? 0) - t.amountCents
}

/**
 * Contribuição para o “Saldo no período” do resumo (lista já filtrada).
 * `accountFilter === 'all'`: transferências somam 0.
 */
export function summaryPeriodDelta(t: Transaction, accountFilter: 'all' | string): number {
  if (t.type === 'transfer') {
    if (accountFilter === 'all') return 0
    if (t.fromAccountId === accountFilter) return -t.amountCents
    if (t.toAccountId === accountFilter) return t.amountCents
    return 0
  }
  if (t.kind === 'opening_balance') {
    if (accountFilter !== 'all' && t.accountId !== accountFilter) return 0
    return t.amountCents
  }
  if (accountFilter !== 'all' && t.accountId !== accountFilter) return 0
  if (t.type === 'income') return t.amountCents
  if (t.type === 'expense') return -t.amountCents
  return 0
}

/** Legado: uma conta só; transfer não altera número único. */
export function transactionNetCents(t: Transaction): number {
  if (t.kind === 'opening_balance') return t.amountCents
  if (t.type === 'transfer') return 0
  return t.type === 'income' ? t.amountCents : -t.amountCents
}

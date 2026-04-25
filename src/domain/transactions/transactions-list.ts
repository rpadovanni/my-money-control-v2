import type { Transaction, TransactionsSort } from './types'

/**
 * Comparador para ordenar a lista de transações conforme `TransactionsSort`.
 * Em empate por critério principal, desempata por `createdAt` (mais recente primeiro).
 */
export function buildTransactionsComparator(sort: TransactionsSort) {
  return (a: Transaction, b: Transaction): number => {
    switch (sort) {
      case 'date_asc': {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return b.createdAt.localeCompare(a.createdAt)
      }
      case 'amount_desc': {
        if (a.amountCents !== b.amountCents) return b.amountCents - a.amountCents
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        return b.createdAt.localeCompare(a.createdAt)
      }
      case 'amount_asc': {
        if (a.amountCents !== b.amountCents) return a.amountCents - b.amountCents
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        return b.createdAt.localeCompare(a.createdAt)
      }
      case 'date_desc':
      default: {
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        return b.createdAt.localeCompare(a.createdAt)
      }
    }
  }
}

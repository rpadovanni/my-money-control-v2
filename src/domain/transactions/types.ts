export type TransactionType = 'income' | 'expense' | 'transfer'

export type TransactionKind = 'normal' | 'opening_balance'

export type TransactionCategoryId =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'bills'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'travel'
  | 'salary'
  | 'freelance'
  | 'transfer'
  | 'other'

export interface Transaction {
  id: string
  type: TransactionType
  kind: TransactionKind
  /** Conta principal do lançamento; em `transfer` replica `fromAccountId` (índice / compatibilidade). */
  accountId: string
  fromAccountId?: string
  toAccountId?: string
  amountCents: number
  date: string // YYYY-MM-DD
  category: TransactionCategoryId | string
  description?: string
  createdAt: string
  updatedAt: string
}

export type TransactionsSort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

/**
 * Filtro de período: sem filtro (default), um mês civil ou um intervalo
 * livre de datas no calendário local.
 */
export type TransactionsPeriod =
  | { kind: 'all' }
  | { kind: 'month'; month: string } // YYYY-MM
  | { kind: 'range'; start: string; end: string } // YYYY-MM-DD inclusivos

export interface TransactionsFilters {
  period: TransactionsPeriod
  type: 'all' | TransactionType
  category: string | null
  accountId: string | 'all'
  /** Texto livre — casa apenas no título (descrição). Vazio = sem busca. */
  search: string
  sort: TransactionsSort
}

export interface NewTransactionInput {
  type: TransactionType
  /** Receita/despesa/saldo inicial */
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  /** Usado para saldo inicial: valor com sinal (positivo aumenta o saldo da conta). */
  amountCents: number
  date: string
  category: string
  description?: string
  kind?: TransactionKind
}

export interface UpdateTransactionInput {
  type?: TransactionType
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  amountCents?: number
  date?: string
  category?: string
  description?: string
}

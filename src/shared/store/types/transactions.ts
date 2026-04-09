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

export interface TransactionCategory {
  id: string
  label: string
  system?: boolean
}

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

export interface TransactionsFilters {
  month: string // YYYY-MM
  type: 'all' | TransactionType
  category: string | null
  accountId: string | 'all'
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

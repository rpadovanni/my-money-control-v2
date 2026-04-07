export type TransactionType = 'income' | 'expense'

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
  | 'other'

export interface TransactionCategory {
  id: TransactionCategoryId
  label: string
}

export interface Transaction {
  id: string
  type: TransactionType
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
}

export interface NewTransactionInput {
  type: TransactionType
  amountCents: number
  date: string
  category: string
  description?: string
}

export interface UpdateTransactionInput {
  type?: TransactionType
  amountCents?: number
  date?: string
  category?: string
  description?: string
}


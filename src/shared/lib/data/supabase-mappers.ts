import type { Account, AccountType } from '../../../domain/accounts/types'
import type { Transaction, TransactionKind, TransactionType } from '../../../domain/transactions/types'

export type AccountRow = {
  id: string
  user_id: string
  name: string
  type: string
  is_default: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type TransactionRow = {
  id: string
  user_id: string
  type: string
  kind: string
  account_id: string
  from_account_id: string | null
  to_account_id: string | null
  amount_cents: number
  date: string
  category: string
  description: string | null
  created_at: string
  updated_at: string
}

export function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type as AccountType,
    isDefault: row.is_default,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function accountToRow(account: Account, userId: string): AccountRow {
  return {
    id: account.id,
    user_id: userId,
    name: account.name,
    type: account.type,
    is_default: account.isDefault,
    is_archived: account.isArchived,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
  }
}

export function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as TransactionType,
    kind: row.kind as TransactionKind,
    accountId: row.account_id,
    fromAccountId: row.from_account_id ?? undefined,
    toAccountId: row.to_account_id ?? undefined,
    amountCents: Number(row.amount_cents),
    date: row.date,
    category: row.category,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function transactionToRow(tx: Transaction, userId: string): TransactionRow {
  return {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    kind: tx.kind,
    account_id: tx.accountId,
    from_account_id: tx.fromAccountId ?? null,
    to_account_id: tx.toAccountId ?? null,
    amount_cents: tx.amountCents,
    date: tx.date,
    category: tx.category,
    description: tx.description ?? null,
    created_at: tx.createdAt,
    updated_at: tx.updatedAt,
  }
}

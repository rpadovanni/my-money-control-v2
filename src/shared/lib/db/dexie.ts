import Dexie, { type Table } from 'dexie'
import { nowTimestampISO } from '../dates'
import type { Account } from '../../../domain/accounts/types'
import type { CategoryRecord, CategoryType } from '../../../domain/categories/types'
import type { Transaction } from '../../../domain/transactions/types'

const INCOME_CATEGORY_IDS = new Set(['salary', 'freelance'])

function inferCategoryType(id: string): CategoryType {
  if (id === 'transfer') return 'transfer'
  if (INCOME_CATEGORY_IDS.has(id)) return 'income'
  return 'expense'
}

export class AppDB extends Dexie {
  transactions!: Table<Transaction, string>
  accounts!: Table<Account, string>
  categories!: Table<CategoryRecord, string>

  constructor() {
    super('my-money-control')
    this.version(1).stores({
      transactions: 'id, date, type, category, createdAt, updatedAt',
    })

    this.version(2)
      .stores({
        transactions: 'id, date, type, kind, category, accountId, createdAt, updatedAt',
        accounts: 'id, isDefault, isArchived, createdAt, updatedAt',
      })
      .upgrade(async (tx) => {
        const DEFAULT_ACCOUNT_ID = 'account-default'
        const ts = nowTimestampISO()

        const accounts = tx.table('accounts') as Dexie.Table<Account, string>
        const existingDefault = await accounts.get(DEFAULT_ACCOUNT_ID)
        if (!existingDefault) {
          await accounts.add({
            id: DEFAULT_ACCOUNT_ID,
            name: 'Carteira',
            type: 'wallet',
            isDefault: true,
            isArchived: false,
            createdAt: ts,
            updatedAt: ts,
          })
        } else if (!existingDefault.isDefault) {
          await accounts.update(DEFAULT_ACCOUNT_ID, { isDefault: true, updatedAt: ts })
        }

        type LegacyTx = { kind?: unknown; accountId?: unknown }
        const transactions = tx.table('transactions') as Dexie.Table<LegacyTx, string>
        await transactions.toCollection().modify((t) => {
          if (t.kind == null) t.kind = 'normal'
          if (t.accountId == null) t.accountId = DEFAULT_ACCOUNT_ID
        })
      })

    this.version(3).stores({
      transactions:
        'id, date, type, kind, category, accountId, fromAccountId, toAccountId, createdAt, updatedAt',
      accounts: 'id, isDefault, isArchived, createdAt, updatedAt',
    })

    this.version(4).stores({
      transactions:
        'id, date, type, kind, category, accountId, fromAccountId, toAccountId, createdAt, updatedAt',
      accounts: 'id, isDefault, isArchived, createdAt, updatedAt',
      categories: 'id, label, system, createdAt, updatedAt',
    })

    this.version(5)
      .stores({
        transactions:
          'id, date, type, kind, category, accountId, fromAccountId, toAccountId, createdAt, updatedAt',
        accounts: 'id, isDefault, isArchived, createdAt, updatedAt',
        categories: 'id, label, type, system, createdAt, updatedAt',
      })
      .upgrade(async (tx) => {
        type LegacyCategory = { id: string; type?: CategoryType; updatedAt?: string }
        const categories = tx.table('categories') as Dexie.Table<LegacyCategory, string>
        const ts = nowTimestampISO()
        await categories.toCollection().modify((category) => {
          if (!category.type) {
            category.type = inferCategoryType(category.id)
            category.updatedAt = ts
          }
        })
      })
  }
}

export const db = new AppDB()


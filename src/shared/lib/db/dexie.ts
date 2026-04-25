import Dexie, { type Table } from 'dexie'
import { nowTimestampISO } from '../dates'
import type { Account } from '../../../domain/accounts/types'
import { DEFAULT_CATEGORY_SEEDS } from './category-seed'
import type { CategoryRecord } from '../../../domain/categories/types'
import type { Transaction } from '../../../domain/transactions/types'

export const DEXIE_DB_NAME = 'my-money-control'

export class AppDB extends Dexie {
  transactions!: Table<Transaction, string>
  accounts!: Table<Account, string>
  categories!: Table<CategoryRecord, string>

  constructor() {
    super(DEXIE_DB_NAME)
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

    // v6: migração "hard reset" para eliminar legado.
    // Como este ambiente ainda não tem uso real, preferimos resetar os dados
    // locais ao invés de manter regras de inferência em runtime.
    this.version(6)
      .stores({
        transactions:
          'id, date, type, kind, category, accountId, fromAccountId, toAccountId, createdAt, updatedAt',
        accounts: 'id, isDefault, isArchived, createdAt, updatedAt',
        categories: 'id, label, type, system, createdAt, updatedAt',
      })
      .upgrade(async (tx) => {
        const ts = nowTimestampISO()
        const DEFAULT_ACCOUNT_ID = 'account-default'

        const transactions = tx.table('transactions') as Dexie.Table<Transaction, string>
        const accounts = tx.table('accounts') as Dexie.Table<Account, string>
        const categories = tx.table('categories') as Dexie.Table<CategoryRecord, string>

        await transactions.clear()
        await accounts.clear()
        await categories.clear()

        await accounts.add({
          id: DEFAULT_ACCOUNT_ID,
          name: 'Carteira',
          type: 'wallet',
          isDefault: true,
          isArchived: false,
          createdAt: ts,
          updatedAt: ts,
        })

        await categories.bulkAdd(
          DEFAULT_CATEGORY_SEEDS.map((s) => ({
            id: s.id,
            label: s.label,
            type: s.type,
            system: s.system,
            createdAt: ts,
            updatedAt: ts,
          })),
        )
      })
  }
}

export const db = new AppDB()

/** Apaga completamente o IndexedDB da app (reset total). */
export async function resetLocalDexieDb(): Promise<void> {
  // Fecha conexões e remove a base inteira.
  await db.delete()
}


import Dexie, { type Table } from 'dexie'
import { nowTimestampISO } from '../dates'
import type { Account } from '../../store/types/accounts'
import type { Transaction } from '../../store/types/transactions'

export class AppDB extends Dexie {
  transactions!: Table<Transaction, string>
  accounts!: Table<Account, string>

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
  }
}

export const db = new AppDB()


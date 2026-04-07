import Dexie, { type Table } from 'dexie'
import type { Transaction } from '../../store/types/transactions'

export class AppDB extends Dexie {
  transactions!: Table<Transaction, string>

  constructor() {
    super('my-money-control')
    this.version(1).stores({
      transactions: 'id, date, type, category, createdAt, updatedAt',
    })
  }
}

export const db = new AppDB()


import { db } from './dexie'
import type {
  NewTransactionInput,
  Transaction,
  TransactionsFilters,
  UpdateTransactionInput,
} from '../../store/types/transactions'

function nowISO() {
  return new Date().toISOString()
}

function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, 1))
  const end = new Date(Date.UTC(y, (m ?? 1), 0))
  const startISO = start.toISOString().slice(0, 10)
  const endISO = end.toISOString().slice(0, 10)
  return { startISO, endISO }
}

export class TransactionsRepository {
  async list(filters: TransactionsFilters): Promise<Transaction[]> {
    const { startISO, endISO } = monthBounds(filters.month)

    let coll = db.transactions.where('date').between(startISO, endISO, true, true)
    if (filters.type !== 'all') {
      coll = coll.and((t) => t.type === filters.type)
    }
    if (filters.category) {
      coll = coll.and((t) => t.category === filters.category)
    }

    const items = await coll.toArray()
    items.sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
    return items
  }

  async add(input: NewTransactionInput): Promise<Transaction> {
    const ts = nowISO()
    const tx: Transaction = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      type: input.type,
      amountCents: input.amountCents,
      date: input.date,
      category: input.category,
      description: input.description,
      createdAt: ts,
      updatedAt: ts,
    }

    await db.transactions.add(tx)
    return tx
  }

  async update(id: string, patch: UpdateTransactionInput): Promise<Transaction | null> {
    const existing = await db.transactions.get(id)
    if (!existing) return null

    const next: Transaction = {
      ...existing,
      ...patch,
      updatedAt: nowISO(),
    }
    await db.transactions.put(next)
    return next
  }

  async delete(id: string): Promise<void> {
    await db.transactions.delete(id)
  }
}

export const transactionsRepo = new TransactionsRepository()


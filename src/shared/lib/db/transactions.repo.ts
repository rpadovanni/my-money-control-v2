import { monthDayBounds, nowTimestampISO } from '../dates'
import { transactionNetCents } from '../transaction-net'
import { db } from './dexie'
import type {
  NewTransactionInput,
  Transaction,
  TransactionsFilters,
  UpdateTransactionInput,
} from '../../store/types/transactions'

export class TransactionsRepository {
  async list(filters: TransactionsFilters): Promise<Transaction[]> {
    const { startISO, endISO } = monthDayBounds(filters.month)

    let coll = db.transactions.where('date').between(startISO, endISO, true, true)
    if (filters.type !== 'all') {
      coll = coll.and((t) => t.kind === 'normal' && t.type === filters.type)
    }
    if (filters.category) {
      coll = coll.and((t) => t.category === filters.category)
    }
    if (filters.accountId !== 'all') {
      coll = coll.and((t) => t.accountId === filters.accountId)
    }

    const items = await coll.toArray()
    items.sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
    return items
  }

  async add(input: NewTransactionInput): Promise<Transaction> {
    const ts = nowTimestampISO()
    const kind = input.kind ?? 'normal'
    if (kind === 'normal' && input.amountCents <= 0) {
      throw new Error('Valor da transação deve ser maior que zero')
    }
    if (kind === 'opening_balance' && input.amountCents === 0) {
      throw new Error('Saldo inicial não pode ser zero')
    }
    const tx: Transaction = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      type: input.type,
      kind,
      accountId: input.accountId,
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
      updatedAt: nowTimestampISO(),
    }
    await db.transactions.put(next)
    return next
  }

  async delete(id: string): Promise<void> {
    await db.transactions.delete(id)
  }

  /** Primeiro saldo inicial da conta (por `createdAt`), se houver vários. */
  async getOpeningBalanceForAccount(accountId: string): Promise<Transaction | null> {
    const rows = await db.transactions
      .filter((t) => t.accountId === accountId && t.kind === 'opening_balance')
      .toArray()
    if (rows.length === 0) return null
    rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return rows[0] ?? null
  }

  /** Remove todos os saldos iniciais da conta e, se `amountCents` for não nulo e ≠ 0, cria um novo. */
  async setOpeningBalanceForAccount(accountId: string, amountCents: number | null, date: string): Promise<void> {
    const rows = await db.transactions
      .filter((t) => t.accountId === accountId && t.kind === 'opening_balance')
      .toArray()
    await Promise.all(rows.map((row) => db.transactions.delete(row.id)))
    if (amountCents != null && amountCents !== 0) {
      await this.add({
        type: 'income',
        kind: 'opening_balance',
        accountId,
        amountCents,
        date,
        category: 'other',
        description: 'Saldo inicial',
      })
    }
  }

  /** Saldo acumulado por conta (todas as transações). */
  async getBalancesCentsByAccountId(): Promise<Record<string, number>> {
    const all = await db.transactions.toArray()
    const out: Record<string, number> = {}
    for (const t of all) {
      const id = t.accountId
      out[id] = (out[id] ?? 0) + transactionNetCents(t)
    }
    return out
  }
}

export const transactionsRepo = new TransactionsRepository()

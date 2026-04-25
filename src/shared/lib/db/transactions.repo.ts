/** Contratos e agregação de saldo: `src/domain/transactions`. */
import type { Collection } from 'dexie'
import { monthDayBounds, nowTimestampISO } from '../dates'
import { applyTransactionToBalanceMap } from '../../../domain/transactions/transaction-net'
import { buildTransactionsComparator } from '../../../domain/transactions/transactions-list'
import { db } from './dexie'
import type { Account } from '../../../domain/accounts/types'
import type {
  NewTransactionInput,
  Transaction,
  TransactionsFilters,
  UpdateTransactionInput,
} from '../../../domain/transactions/types'

export class TransactionsRepository {
  async list(filters: TransactionsFilters): Promise<Transaction[]> {
    let coll: Collection<Transaction, string>
    if (filters.period.kind === 'month') {
      const { startISO, endISO } = monthDayBounds(filters.period.month)
      coll = db.transactions.where('date').between(startISO, endISO, true, true)
    } else if (filters.period.kind === 'range') {
      coll = db.transactions
        .where('date')
        .between(filters.period.start, filters.period.end, true, true)
    } else {
      coll = db.transactions.toCollection()
    }

    if (filters.type !== 'all') {
      if (filters.type === 'transfer') {
        coll = coll.and((t) => t.type === 'transfer')
      } else {
        coll = coll.and((t) => t.kind === 'normal' && t.type === filters.type)
      }
    }
    if (filters.category) {
      coll = coll.and((t) => t.category === filters.category)
    }
    if (filters.accountId !== 'all') {
      const id = filters.accountId
      coll = coll.and((t) => {
        if (t.type === 'transfer') {
          return t.fromAccountId === id || t.toAccountId === id
        }
        return t.accountId === id
      })
    }
    const search = filters.search.trim().toLowerCase()
    if (search.length > 0) {
      coll = coll.and((t) => (t.description ?? '').toLowerCase().includes(search))
    }

    const items = await coll.toArray()
    items.sort(buildTransactionsComparator(filters.sort))
    return items
  }

  async add(input: NewTransactionInput): Promise<Transaction> {
    const ts = nowTimestampISO()
    const kind = input.kind ?? 'normal'

    if (input.type === 'transfer') {
      const from = input.fromAccountId
      const to = input.toAccountId
      if (!from || !to) throw new Error('Transferência exige conta de origem e destino')
      if (from === to) throw new Error('Origem e destino devem ser diferentes')
      if (input.amountCents <= 0) throw new Error('Valor da transferência deve ser maior que zero')

      const tx: Transaction = {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        type: 'transfer',
        kind: 'normal',
        accountId: from,
        fromAccountId: from,
        toAccountId: to,
        amountCents: input.amountCents,
        date: input.date,
        category: 'transfer',
        description: input.description,
        createdAt: ts,
        updatedAt: ts,
      }
      await db.transactions.add(tx)
      return tx
    }

    if (!input.accountId) throw new Error('Conta obrigatória')

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

    if (next.type === 'transfer') {
      const from = next.fromAccountId ?? existing.fromAccountId
      const to = next.toAccountId ?? existing.toAccountId
      if (!from || !to || from === to) {
        throw new Error('Transferência inválida: origem e destino obrigatórios e distintos')
      }
      next.fromAccountId = from
      next.toAccountId = to
      next.accountId = from
      if (!next.category) next.category = 'transfer'
    }

    await db.transactions.put(next)
    return next
  }

  async delete(id: string): Promise<void> {
    await db.transactions.delete(id)
  }

  async countByCategory(categoryId: string): Promise<number> {
    return await db.transactions.where('category').equals(categoryId).count()
  }

  async getOpeningBalanceForAccount(accountId: string): Promise<Transaction | null> {
    const rows = await db.transactions
      .filter((t) => t.accountId === accountId && t.kind === 'opening_balance')
      .toArray()
    if (rows.length === 0) return null
    rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return rows[0] ?? null
  }

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

  async getBalancesCentsByAccountId(): Promise<Record<string, number>> {
    const all = await db.transactions.toArray()
    const out: Record<string, number> = {}
    for (const t of all) {
      applyTransactionToBalanceMap(t, out)
    }
    return out
  }

  /**
   * “A pagar” no mês civil `monthYYYYMM`: despesas no cartão − transferências recebidas no cartão no mesmo mês.
   */
  async getCreditCardPayablesForMonth(monthYYYYMM: string): Promise<Record<string, number>> {
    const { startISO, endISO } = monthDayBounds(monthYYYYMM)
    const [rows, accounts] = await Promise.all([
      db.transactions.where('date').between(startISO, endISO, true, true).toArray(),
      db.accounts.toArray() as Promise<Account[]>,
    ])
    const creditIds = new Set(accounts.filter((a) => a.type === 'credit_card').map((a) => a.id))
    if (creditIds.size === 0) return {}

    const expensesByCard: Record<string, number> = {}
    const paymentsByCard: Record<string, number> = {}

    for (const t of rows) {
      if (t.type === 'expense' && t.kind === 'normal' && creditIds.has(t.accountId)) {
        expensesByCard[t.accountId] = (expensesByCard[t.accountId] ?? 0) + t.amountCents
      }
      if (t.type === 'transfer' && t.toAccountId && creditIds.has(t.toAccountId)) {
        paymentsByCard[t.toAccountId] = (paymentsByCard[t.toAccountId] ?? 0) + t.amountCents
      }
    }

    const out: Record<string, number> = {}
    for (const id of creditIds) {
      const e = expensesByCard[id] ?? 0
      const p = paymentsByCard[id] ?? 0
      out[id] = Math.max(0, e - p)
    }
    return out
  }
}

export const localTransactionsRepo = new TransactionsRepository()

/**
 * Dependência intencional `shared/lib` → `features/transactions`:
 * - `applyTransactionToBalanceMap` e tipos alinhados ao domínio evitam duas implementações
 *   divergentes do efeito de cada transação nos saldos (local vs remoto).
 * - Reavaliar se no futuro os repositórios migrarem para dentro da feature ou existir um
 *   módulo neutro de contratos gerado a partir do schema.
 */
import { applyTransactionToBalanceMap } from '../../../features/transactions/utils/transaction-net'
import { monthDayBounds, nowTimestampISO } from '../dates'
import { requireRemote } from './remote-context'
import type { AccountRow, TransactionRow } from './supabase-mappers'
import { rowToAccount, rowToTransaction, transactionToRow } from './supabase-mappers'
import type {
  NewTransactionInput,
  Transaction,
  TransactionsFilters,
  UpdateTransactionInput,
} from '../../../features/transactions/types/transactions'

export const remoteTransactionsRepo = {
  async list(filters: TransactionsFilters): Promise<Transaction[]> {
    const { client, userId } = requireRemote()
    const { startISO, endISO } = monthDayBounds(filters.month)

    let q = client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startISO)
      .lte('date', endISO)

    if (filters.type !== 'all') {
      if (filters.type === 'transfer') {
        q = q.eq('type', 'transfer')
      } else {
        q = q.eq('kind', 'normal').eq('type', filters.type)
      }
    }

    if (filters.category) {
      q = q.eq('category', filters.category)
    }

    let needAccountFilter = false
    let accountFilterId = ''
    if (filters.accountId !== 'all') {
      needAccountFilter = true
      accountFilterId = filters.accountId
    }

    const { data, error } = await q
    if (error) throw new Error(error.message)

    let items = (data ?? []).map((r) => rowToTransaction(r as TransactionRow))

    if (needAccountFilter) {
      const id = accountFilterId
      items = items.filter((t) => {
        if (t.type === 'transfer') {
          return t.fromAccountId === id || t.toAccountId === id
        }
        return t.accountId === id
      })
    }

    items.sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    )
    return items
  },

  async add(input: NewTransactionInput): Promise<Transaction> {
    const { client, userId } = requireRemote()
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
      const row = transactionToRow(tx, userId)
      const { error } = await client.from('transactions').insert(row)
      if (error) throw new Error(error.message)
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
    const row = transactionToRow(tx, userId)
    const { error } = await client.from('transactions').insert(row)
    if (error) throw new Error(error.message)
    return tx
  },

  async update(id: string, patch: UpdateTransactionInput): Promise<Transaction | null> {
    const { client, userId } = requireRemote()
    const { data: row, error: gErr } = await client
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (gErr) throw new Error(gErr.message)
    if (!row) return null

    const existing = rowToTransaction(row as TransactionRow)
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

    const out = transactionToRow(next, userId)
    const { error } = await client
      .from('transactions')
      .update({
        type: out.type,
        kind: out.kind,
        account_id: out.account_id,
        from_account_id: out.from_account_id,
        to_account_id: out.to_account_id,
        amount_cents: out.amount_cents,
        date: out.date,
        category: out.category,
        description: out.description,
        updated_at: out.updated_at,
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
    return next
  },

  async delete(id: string): Promise<void> {
    const { client, userId } = requireRemote()
    const { error } = await client.from('transactions').delete().eq('id', id).eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async getOpeningBalanceForAccount(accountId: string): Promise<Transaction | null> {
    const { client, userId } = requireRemote()
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('kind', 'opening_balance')
    if (error) throw new Error(error.message)
    const rows = (data ?? []).map((r) => rowToTransaction(r as TransactionRow))
    if (rows.length === 0) return null
    rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return rows[0] ?? null
  },

  async setOpeningBalanceForAccount(
    accountId: string,
    amountCents: number | null,
    date: string,
  ): Promise<void> {
    const { client, userId } = requireRemote()
    const { error: delErr } = await client
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('kind', 'opening_balance')
    if (delErr) throw new Error(delErr.message)

    if (amountCents != null && amountCents !== 0) {
      await remoteTransactionsRepo.add({
        type: 'income',
        kind: 'opening_balance',
        accountId,
        amountCents,
        date,
        category: 'other',
        description: 'Saldo inicial',
      })
    }
  },

  async getBalancesCentsByAccountId(): Promise<Record<string, number>> {
    const { client, userId } = requireRemote()
    const { data, error } = await client.from('transactions').select('*').eq('user_id', userId)
    if (error) throw new Error(error.message)
    const out: Record<string, number> = {}
    for (const r of data ?? []) {
      applyTransactionToBalanceMap(rowToTransaction(r as TransactionRow), out)
    }
    return out
  },

  async getCreditCardPayablesForMonth(monthYYYYMM: string): Promise<Record<string, number>> {
    const { client, userId } = requireRemote()
    const { startISO, endISO } = monthDayBounds(monthYYYYMM)

    const [{ data: txData, error: txErr }, { data: accData, error: accErr }] = await Promise.all([
      client
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startISO)
        .lte('date', endISO),
      client.from('accounts').select('*').eq('user_id', userId),
    ])

    if (txErr) throw new Error(txErr.message)
    if (accErr) throw new Error(accErr.message)

    const accounts = (accData ?? []).map((r) => rowToAccount(r as AccountRow))
    const creditIds = new Set(accounts.filter((a) => a.type === 'credit_card').map((a) => a.id))
    if (creditIds.size === 0) return {}

    const rows = (txData ?? []).map((r) => rowToTransaction(r as TransactionRow))

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
  },

  async countByCategory(categoryId: string): Promise<number> {
    const { client, userId } = requireRemote()
    const { count, error } = await client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', categoryId)
    if (error) throw new Error(error.message)
    return count ?? 0
  },
}

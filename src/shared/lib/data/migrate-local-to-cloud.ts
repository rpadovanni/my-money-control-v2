import { db } from '../db/dexie'
import { requireRemote } from './remote-context'
import { accountToRow, transactionToRow } from './supabase-mappers'

const MIGRATE_FLAG_PREFIX = 'mmc_migrated_local_to_cloud_'

export function wasLocalDataMigratedForUser(userId: string): boolean {
  return globalThis.localStorage?.getItem(MIGRATE_FLAG_PREFIX + userId) === '1'
}

export function markLocalDataMigratedForUser(userId: string): void {
  globalThis.localStorage?.setItem(MIGRATE_FLAG_PREFIX + userId, '1')
}

/**
 * Envia todas as contas e transações do Dexie deste navegador para o projeto Supabase
 * do usuário atual. Use uma vez por conta/dispositivo (flag em `localStorage`).
 */
export async function migrateLocalDexieToCloud(): Promise<{ accounts: number; transactions: number }> {
  const { client, userId } = requireRemote()
  if (wasLocalDataMigratedForUser(userId)) {
    throw new Error('Os dados locais deste aparelho já foram enviados para esta conta.')
  }

  const accounts = await db.accounts.toArray()
  const transactions = await db.transactions.toArray()
  const categories = await db.categories.toArray()

  if (accounts.length === 0 && transactions.length === 0 && categories.length === 0) {
    return { accounts: 0, transactions: 0 }
  }

  const accountRows = accounts.map((a) => accountToRow(a, userId))
  if (accountRows.length > 0) {
    const { error: aErr } = await client.from('accounts').upsert(accountRows, { onConflict: 'id' })
    if (aErr) throw new Error(aErr.message)
  }

  const txRows = transactions.map((t) => transactionToRow(t, userId))
  if (txRows.length > 0) {
    const { error: tErr } = await client.from('transactions').upsert(txRows, { onConflict: 'id' })
    if (tErr) throw new Error(tErr.message)
  }

  if (categories.length > 0) {
    const catRows = categories.map((c) => ({
      user_id: userId,
      id: c.id,
      label: c.label,
      system: c.system,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    }))
    const { error: cErr } = await client.from('categories').upsert(catRows, { onConflict: 'user_id,id' })
    if (cErr) throw new Error(cErr.message)
  }

  markLocalDataMigratedForUser(userId)
  return { accounts: accounts.length, transactions: transactions.length }
}

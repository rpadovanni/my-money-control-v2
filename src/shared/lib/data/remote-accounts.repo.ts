import { nowTimestampISO } from '../dates'
import { requireRemote } from './remote-context'
import type { AccountRow } from './supabase-mappers'
import { accountToRow, rowToAccount } from './supabase-mappers'
import type { Account, NewAccountInput, UpdateAccountInput } from '../../store/types/accounts'

export const remoteAccountsRepo = {
  async list(opts?: { includeArchived?: boolean }): Promise<Account[]> {
    const { client, userId } = requireRemote()
    const includeArchived = opts?.includeArchived ?? false
    let q = client.from('accounts').select('*').eq('user_id', userId)
    if (!includeArchived) q = q.eq('is_archived', false)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const items = (data ?? []).map((r) => rowToAccount(r as AccountRow))
    items.sort((a, b) => (a.isDefault === b.isDefault ? a.name.localeCompare(b.name) : a.isDefault ? -1 : 1))
    return items
  },

  async listArchived(): Promise<Account[]> {
    const { client, userId } = requireRemote()
    const { data, error } = await client
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', true)
    if (error) throw new Error(error.message)
    const items = (data ?? []).map((r) => rowToAccount(r as AccountRow))
    items.sort((a, b) => a.name.localeCompare(b.name))
    return items
  },

  async get(id: string): Promise<Account | null> {
    const { client, userId } = requireRemote()
    const { data, error } = await client
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToAccount(data as AccountRow) : null
  },

  async getDefault(): Promise<Account | null> {
    const { client, userId } = requireRemote()
    const { data, error } = await client
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToAccount(data as AccountRow) : null
  },

  async add(input: NewAccountInput & { makeDefault?: boolean }): Promise<Account> {
    const { client, userId } = requireRemote()
    const ts = nowTimestampISO()
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

    const { count, error: countErr } = await client
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countErr) throw new Error(countErr.message)

    const shouldBeDefault = Boolean(input.makeDefault) || (count ?? 0) === 0
    if (shouldBeDefault) {
      const u = nowTimestampISO()
      const { error: clearErr } = await client
        .from('accounts')
        .update({ is_default: false, updated_at: u })
        .eq('user_id', userId)
      if (clearErr) throw new Error(clearErr.message)
    }

    const row: AccountRow = {
      id,
      user_id: userId,
      name: input.name.trim(),
      type: input.type,
      is_default: shouldBeDefault,
      is_archived: false,
      created_at: ts,
      updated_at: ts,
    }

    const { error } = await client.from('accounts').insert(row)
    if (error) throw new Error(error.message)

    return rowToAccount(row)
  },

  async update(id: string, patch: UpdateAccountInput): Promise<Account | null> {
    const { client, userId } = requireRemote()
    const existing = await remoteAccountsRepo.get(id)
    if (!existing) return null

    const next: Account = {
      ...existing,
      ...patch,
      updatedAt: nowTimestampISO(),
    }
    const row = accountToRow(next, userId)
    const { error } = await client
      .from('accounts')
      .update({
        name: row.name,
        type: row.type,
        is_default: row.is_default,
        is_archived: row.is_archived,
        updated_at: row.updated_at,
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
    return next
  },

  async setDefault(id: string): Promise<void> {
    const { client, userId } = requireRemote()
    const ts = nowTimestampISO()
    const { error: c1 } = await client
      .from('accounts')
      .update({ is_default: false, updated_at: ts })
      .eq('user_id', userId)
    if (c1) throw new Error(c1.message)
    const { error: c2 } = await client
      .from('accounts')
      .update({ is_default: true, updated_at: ts })
      .eq('id', id)
      .eq('user_id', userId)
    if (c2) throw new Error(c2.message)
  },

  async archive(id: string): Promise<void> {
    const { client, userId } = requireRemote()
    const { error } = await client
      .from('accounts')
      .update({ is_archived: true, is_default: false, updated_at: nowTimestampISO() })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async unarchive(id: string): Promise<void> {
    const { client, userId } = requireRemote()
    const { error } = await client
      .from('accounts')
      .update({ is_archived: false, updated_at: nowTimestampISO() })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  },
}

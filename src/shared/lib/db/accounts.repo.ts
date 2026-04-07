import { nowTimestampISO } from '../dates'
import { db } from './dexie'
import type { Account, NewAccountInput, UpdateAccountInput } from '../../store/types/accounts'

export class AccountsRepository {
  async list(opts?: { includeArchived?: boolean }): Promise<Account[]> {
    const includeArchived = opts?.includeArchived ?? false
    const items = await db.accounts.toArray()
    const filtered = includeArchived ? items : items.filter((a) => !a.isArchived)
    filtered.sort((a, b) => (a.isDefault === b.isDefault ? a.name.localeCompare(b.name) : a.isDefault ? -1 : 1))
    return filtered
  }

  async listArchived(): Promise<Account[]> {
    const items = await db.accounts.filter((a) => a.isArchived).toArray()
    items.sort((a, b) => a.name.localeCompare(b.name))
    return items
  }

  async get(id: string): Promise<Account | null> {
    return (await db.accounts.get(id)) ?? null
  }

  async getDefault(): Promise<Account | null> {
    const all = await db.accounts.filter((a) => a.isDefault).toArray()
    return all[0] ?? null
  }

  async add(input: NewAccountInput & { makeDefault?: boolean }): Promise<Account> {
    const ts = nowTimestampISO()
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

    const shouldBeDefault = Boolean(input.makeDefault) || (await db.accounts.count()) === 0
    if (shouldBeDefault) {
      await this.clearDefault()
    }

    const account: Account = {
      id,
      name: input.name.trim(),
      type: input.type,
      isDefault: shouldBeDefault,
      isArchived: false,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.accounts.add(account)
    return account
  }

  async update(id: string, patch: UpdateAccountInput): Promise<Account | null> {
    const existing = await db.accounts.get(id)
    if (!existing) return null

    const next: Account = {
      ...existing,
      ...patch,
      updatedAt: nowTimestampISO(),
    }
    await db.accounts.put(next)
    return next
  }

  async setDefault(id: string): Promise<void> {
    await this.clearDefault()
    await db.accounts.update(id, { isDefault: true, updatedAt: nowTimestampISO() })
  }

  async archive(id: string): Promise<void> {
    await db.accounts.update(id, { isArchived: true, isDefault: false, updatedAt: nowTimestampISO() })
  }

  async unarchive(id: string): Promise<void> {
    await db.accounts.update(id, { isArchived: false, updatedAt: nowTimestampISO() })
  }

  private async clearDefault(): Promise<void> {
    const defaults = await db.accounts.filter((a) => a.isDefault).toArray()
    const ts = nowTimestampISO()
    await Promise.all(defaults.map((a) => db.accounts.update(a.id, { isDefault: false, updatedAt: ts })))
  }
}

export const accountsRepo = new AccountsRepository()


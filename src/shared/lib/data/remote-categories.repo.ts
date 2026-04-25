import { nowTimestampISO } from '../dates'
import { DEFAULT_CATEGORY_SEEDS } from '../db/category-seed'
import { requireRemote } from './remote-context'
import type { CategoryRecord, CategoryType } from '../../../domain/categories/types'

type CategoryRow = {
  user_id: string
  id: string
  label: string
  type?: CategoryType
  system: boolean
  created_at: string
  updated_at: string
}

const INCOME_CATEGORY_IDS = new Set(['salary', 'freelance'])

function inferCategoryType(id: string): CategoryType {
  if (id === 'transfer') return 'transfer'
  if (INCOME_CATEGORY_IDS.has(id)) return 'income'
  return 'expense'
}

function rowToRecord(r: CategoryRow): CategoryRecord {
  return {
    id: r.id,
    label: r.label,
    type: r.type ?? inferCategoryType(r.id),
    system: r.system,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function recordToRow(userId: string, c: CategoryRecord): CategoryRow {
  return {
    user_id: userId,
    id: c.id,
    label: c.label,
    type: c.type,
    system: c.system,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }
}

function recordToLegacyRow(userId: string, c: CategoryRecord): Omit<CategoryRow, 'type'> {
  return {
    user_id: userId,
    id: c.id,
    label: c.label,
    system: c.system,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }
}

function isMissingTypeColumnError(error: { message?: string; code?: string } | null): boolean {
  const msg = error?.message?.toLowerCase() ?? ''
  return (
    error?.code === 'PGRST204' ||
    msg.includes('type') && (msg.includes('schema cache') || msg.includes('column'))
  )
}

function slugFromLabel(label: string): string {
  const n = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return n.length > 0 ? n : 'categoria'
}

export const remoteCategoriesRepo = {
  async list(): Promise<CategoryRecord[]> {
    const { client, userId } = requireRemote()
    const { data, error } = await client
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('label', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => rowToRecord(r as CategoryRow))
  },

  async seedIfEmpty(): Promise<void> {
    const { client, userId } = requireRemote()
    const { count, error: cErr } = await client
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (cErr) throw new Error(cErr.message)
    if ((count ?? 0) > 0) return

    const ts = nowTimestampISO()
    const rows = DEFAULT_CATEGORY_SEEDS.map((s) => ({
      user_id: userId,
      id: s.id,
      label: s.label,
      type: s.type,
      system: s.system,
      created_at: ts,
      updated_at: ts,
    }))
    const { error } = await client.from('categories').insert(rows)
    if (!error) return
    if (!isMissingTypeColumnError(error)) throw new Error(error.message)

    const legacyRows = DEFAULT_CATEGORY_SEEDS.map((s) => ({
      user_id: userId,
      id: s.id,
      label: s.label,
      system: s.system,
      created_at: ts,
      updated_at: ts,
    }))
    const { error: legacyError } = await client.from('categories').insert(legacyRows)
    if (legacyError) throw new Error(legacyError.message)
  },

  async create(labelRaw: string, type: CategoryType): Promise<CategoryRecord> {
    const { client, userId } = requireRemote()
    const label = labelRaw.trim()
    if (!label) throw new Error('Nome da categoria é obrigatório.')
    if (label.length > 80) throw new Error('Nome muito longo (máx. 80 caracteres).')
    if (type === 'transfer') throw new Error('Transferência é uma categoria do sistema.')

    const existing = await remoteCategoriesRepo.list()
    const ids = new Set(existing.map((c) => c.id))

    const base = slugFromLabel(label)
    let id = base
    let suffix = 0
    while (ids.has(id)) {
      suffix += 1
      id = `${base}-${suffix}`
    }

    const ts = nowTimestampISO()
    const row: CategoryRecord = {
      id,
      label,
      type,
      system: false,
      createdAt: ts,
      updatedAt: ts,
    }
    const { error } = await client.from('categories').insert(recordToRow(userId, row))
    if (error) {
      if (!isMissingTypeColumnError(error)) throw new Error(error.message)
      const { error: legacyError } = await client
        .from('categories')
        .insert(recordToLegacyRow(userId, row))
      if (legacyError) throw new Error(legacyError.message)
    }
    return row
  },

  async update(id: string, labelRaw: string, type: CategoryType): Promise<CategoryRecord> {
    const { client, userId } = requireRemote()
    const { data: cur, error: gErr } = await client
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle()
    if (gErr) throw new Error(gErr.message)
    if (!cur) throw new Error('Categoria não encontrada.')
    const row = cur as CategoryRow
    if (row.system) throw new Error('Esta categoria não pode ser editada.')

    const label = labelRaw.trim()
    if (!label) throw new Error('Nome da categoria é obrigatório.')
    if (label.length > 80) throw new Error('Nome muito longo (máx. 80 caracteres).')
    if (type === 'transfer') throw new Error('Transferência é uma categoria do sistema.')

    const ts = nowTimestampISO()
    const { error } = await client
      .from('categories')
      .update({ label, type, updated_at: ts })
      .eq('user_id', userId)
      .eq('id', id)
    if (error) {
      if (!isMissingTypeColumnError(error)) throw new Error(error.message)
      const { error: legacyError } = await client
        .from('categories')
        .update({ label, updated_at: ts })
        .eq('user_id', userId)
        .eq('id', id)
      if (legacyError) throw new Error(legacyError.message)
    }

    return { id, label, type, system: false, createdAt: row.created_at, updatedAt: ts }
  },

  async remove(id: string): Promise<void> {
    const { client, userId } = requireRemote()
    const { data: cur, error: gErr } = await client
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle()
    if (gErr) throw new Error(gErr.message)
    if (!cur) return
    if ((cur as CategoryRow).system) throw new Error('Categoria do sistema não pode ser excluída.')

    const { error } = await client.from('categories').delete().eq('user_id', userId).eq('id', id)
    if (error) throw new Error(error.message)
  },
}

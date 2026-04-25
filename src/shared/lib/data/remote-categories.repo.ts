import { nowTimestampISO } from '../dates'
import { DEFAULT_CATEGORY_SEEDS } from '../db/category-seed'
import { requireRemote } from './remote-context'
import { slugFromCategoryLabel } from '../../../domain/categories/category-rules'
import type { CategoryRecord, CategoryType } from '../../../domain/categories/types'

type CategoryRow = {
  user_id: string
  id: string
  label: string
  type: CategoryType
  system: boolean
  created_at: string
  updated_at: string
}

function rowToRecord(r: CategoryRow): CategoryRecord {
  return {
    id: r.id,
    label: r.label,
    type: r.type,
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
    if (error) throw new Error(error.message)
  },

  async create(labelRaw: string, type: CategoryType): Promise<CategoryRecord> {
    const { client, userId } = requireRemote()
    const label = labelRaw.trim()
    if (!label) throw new Error('Nome da categoria é obrigatório.')
    if (label.length > 80) throw new Error('Nome muito longo (máx. 80 caracteres).')
    if (type === 'transfer') throw new Error('Transferência é uma categoria do sistema.')

    const existing = await remoteCategoriesRepo.list()
    const ids = new Set(existing.map((c) => c.id))

    const base = slugFromCategoryLabel(label)
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
    if (error) throw new Error(error.message)
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
    if (error) throw new Error(error.message)

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

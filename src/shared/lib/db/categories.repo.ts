import { nowTimestampISO } from '../dates'
import { db } from './dexie'
import { DEFAULT_CATEGORY_SEEDS } from './category-seed'
import type { CategoryRecord } from '../../store/types/categories'

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

export class CategoriesRepository {
  async list(): Promise<CategoryRecord[]> {
    const rows = await db.categories.orderBy('label').toArray()
    return rows
  }

  async seedIfEmpty(): Promise<void> {
    const n = await db.categories.count()
    if (n > 0) return
    const ts = nowTimestampISO()
    await db.categories.bulkAdd(
      DEFAULT_CATEGORY_SEEDS.map((s) => ({
        id: s.id,
        label: s.label,
        system: s.system,
        createdAt: ts,
        updatedAt: ts,
      })),
    )
  }

  async create(labelRaw: string): Promise<CategoryRecord> {
    const label = labelRaw.trim()
    if (!label) throw new Error('Nome da categoria é obrigatório.')
    if (label.length > 80) throw new Error('Nome muito longo (máx. 80 caracteres).')

    const base = slugFromLabel(label)
    let id = base
    let suffix = 0
    while (await db.categories.get(id)) {
      suffix += 1
      id = `${base}-${suffix}`
    }

    const ts = nowTimestampISO()
    const row: CategoryRecord = {
      id,
      label,
      system: false,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.categories.add(row)
    return row
  }

  async update(id: string, labelRaw: string): Promise<CategoryRecord> {
    const existing = await db.categories.get(id)
    if (!existing) throw new Error('Categoria não encontrada.')
    if (existing.system) throw new Error('Esta categoria não pode ser editada.')

    const label = labelRaw.trim()
    if (!label) throw new Error('Nome da categoria é obrigatório.')
    if (label.length > 80) throw new Error('Nome muito longo (máx. 80 caracteres).')

    const updated: CategoryRecord = {
      ...existing,
      label,
      updatedAt: nowTimestampISO(),
    }
    await db.categories.put(updated)
    return updated
  }

  async remove(id: string): Promise<void> {
    const existing = await db.categories.get(id)
    if (!existing) return
    if (existing.system) throw new Error('Categoria do sistema não pode ser excluída.')
    await db.categories.delete(id)
  }
}

export const localCategoriesRepo = new CategoriesRepository()

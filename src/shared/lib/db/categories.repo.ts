import { nowTimestampISO } from '../dates'
import { db } from './dexie'
import { DEFAULT_CATEGORY_SEEDS } from './category-seed'
import { slugFromCategoryLabel } from '../../../domain/categories/category-rules'
import type { CategoryRecord, CategoryType } from '../../../domain/categories/types'

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
        type: s.type,
        system: s.system,
        createdAt: ts,
        updatedAt: ts,
      })),
    )
  }

  async create(labelRaw: string, type: CategoryType): Promise<CategoryRecord> {
    const label = labelRaw.trim()
    if (!label) throw new Error('Nome da categoria é obrigatório.')
    if (label.length > 80) throw new Error('Nome muito longo (máx. 80 caracteres).')
    if (type === 'transfer') throw new Error('Transferência é uma categoria do sistema.')

    const base = slugFromCategoryLabel(label)
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
      type,
      system: false,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.categories.add(row)
    return row
  }

  async update(id: string, labelRaw: string, type: CategoryType): Promise<CategoryRecord> {
    const existing = await db.categories.get(id)
    if (!existing) throw new Error('Categoria não encontrada.')
    if (existing.system) throw new Error('Esta categoria não pode ser editada.')

    const label = labelRaw.trim()
    if (!label) throw new Error('Nome da categoria é obrigatório.')
    if (label.length > 80) throw new Error('Nome muito longo (máx. 80 caracteres).')
    if (type === 'transfer') throw new Error('Transferência é uma categoria do sistema.')

    const updated: CategoryRecord = {
      ...existing,
      label,
      type,
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

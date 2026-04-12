import { create } from 'zustand'
import { categoriesRepo } from '../../../shared/lib/data/categories.gateway'
import { transactionsRepo } from '../../../shared/lib/data/transactions.gateway'
import type { Category } from '../types/category'

export interface CategoriesSliceState {
  ready: boolean
  items: Category[]
  /** Definido quando a inicialização remota falha (ex.: tabela ausente no Supabase). */
  initError: string | null
}

export interface CategoriesSliceActions {
  categoriesInit: () => Promise<void>
  addCategory: (label: string) => Promise<void>
  updateCategory: (id: string, label: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}

export type CategoriesStore = { categories: CategoriesSliceState } & CategoriesSliceActions

function toItem(r: { id: string; label: string; system: boolean }): Category {
  return { id: r.id, label: r.label, system: r.system }
}

function mapCategoriesInitError(e: unknown): string {
  const msg = e instanceof Error ? e.message : 'Falha ao carregar categorias.'
  const lower = msg.toLowerCase()
  if (
    msg.includes('PGRST205') ||
    lower.includes('could not find the table') ||
    lower.includes('schema cache')
  ) {
    return (
      'A tabela public.categories não existe no Supabase (PostgREST não a enxerga). ' +
      'No painel: SQL Editor → execute o bloco que cria public.categories em docs/database/supabase_schema.sql. ' +
      'Aguarde alguns segundos e use Tentar novamente ou recarregue a página.'
    )
  }
  return msg
}

export const useCategoriesStore = create<CategoriesStore>()((set) => ({
  categories: {
    ready: false,
    items: [],
    initError: null,
  },

  categoriesInit: async () => {
    set((s) => ({ categories: { ...s.categories, ready: false } }))
    try {
      await categoriesRepo.seedIfEmpty()
      const rows = await categoriesRepo.list()
      const items = rows.map(toItem)
      set((s) => ({
        categories: { ...s.categories, items, ready: true, initError: null },
      }))
    } catch (e) {
      set((s) => ({
        categories: {
          ...s.categories,
          items: [],
          ready: true,
          initError: mapCategoriesInitError(e),
        },
      }))
    }
  },

  addCategory: async (label) => {
    const row = await categoriesRepo.create(label)
    set((s) => ({
      categories: {
        ...s.categories,
        initError: null,
        items: [...s.categories.items, toItem(row)].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
      },
    }))
  },

  updateCategory: async (id, label) => {
    const row = await categoriesRepo.update(id, label)
    set((s) => ({
      categories: {
        ...s.categories,
        initError: null,
        items: s.categories.items
          .map((c) => (c.id === id ? toItem(row) : c))
          .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
      },
    }))
  },

  deleteCategory: async (id) => {
    const n = await transactionsRepo.countByCategory(id)
    if (n > 0) {
      throw new Error(
        `Não é possível excluir: existem ${n} lançamento(s) usando esta categoria. Altere ou exclua esses lançamentos primeiro.`,
      )
    }
    await categoriesRepo.remove(id)
    set((s) => ({
      categories: {
        ...s.categories,
        initError: null,
        items: s.categories.items.filter((c) => c.id !== id),
      },
    }))
  },
}))

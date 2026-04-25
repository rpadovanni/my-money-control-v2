export type CategoryType = 'income' | 'expense' | 'transfer'

/** Categoria persistida (Dexie ou Supabase). */
export interface CategoryRecord {
  id: string
  label: string
  type: CategoryType
  /** `true`: ex. transferência; não editar / não excluir. */
  system: boolean
  createdAt: string
  updatedAt: string
}

/** Item da lista de categorias na UI (Dexie ou Supabase). */
export interface Category {
  id: string
  label: string
  type: CategoryType
  system?: boolean
}

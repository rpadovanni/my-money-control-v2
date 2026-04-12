/** Categoria persistida (Dexie ou Supabase). */
export interface CategoryRecord {
  id: string
  label: string
  /** `true`: ex. transferência; não editar / não excluir. */
  system: boolean
  createdAt: string
  updatedAt: string
}

/** Item da lista de categorias na UI (Dexie ou Supabase). */
export interface Category {
  id: string
  label: string
  system?: boolean
}

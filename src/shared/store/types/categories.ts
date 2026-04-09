/** Categoria persistida (Dexie ou Supabase). */
export interface CategoryRecord {
  id: string
  label: string
  /** `true`: ex. transferência; não editar / não excluir. */
  system: boolean
  createdAt: string
  updatedAt: string
}

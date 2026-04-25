import type { CategoryType } from '../../../domain/categories/types'

/** Lista inicial ao criar o banco (usuário pode editar/remover exceto `system`). */
export const DEFAULT_CATEGORY_SEEDS: readonly {
  id: string
  label: string
  type: CategoryType
  system: boolean
}[] = [
  { id: 'salary', label: 'Salário', type: 'income', system: false },
  { id: 'freelance', label: 'Freelance', type: 'income', system: false },
  { id: 'food', label: 'Alimentação', type: 'expense', system: false },
  { id: 'transport', label: 'Transporte', type: 'expense', system: false },
  { id: 'shopping', label: 'Compras', type: 'expense', system: false },
  { id: 'bills', label: 'Contas', type: 'expense', system: false },
  { id: 'health', label: 'Saúde', type: 'expense', system: false },
  { id: 'education', label: 'Educação', type: 'expense', system: false },
  { id: 'entertainment', label: 'Lazer', type: 'expense', system: false },
  { id: 'travel', label: 'Viagem', type: 'expense', system: false },
  { id: 'adjustment', label: 'Ajuste', type: 'expense', system: false },
  { id: 'transfer', label: 'Transferência', type: 'transfer', system: true },
  { id: 'other', label: 'Outros', type: 'expense', system: false },
] as const

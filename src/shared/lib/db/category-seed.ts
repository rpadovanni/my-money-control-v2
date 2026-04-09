/** Lista inicial ao criar o banco (usuário pode editar/remover exceto `system`). */
export const DEFAULT_CATEGORY_SEEDS: readonly { id: string; label: string; system: boolean }[] = [
  { id: 'salary', label: 'Salário', system: false },
  { id: 'freelance', label: 'Freelance', system: false },
  { id: 'food', label: 'Alimentação', system: false },
  { id: 'transport', label: 'Transporte', system: false },
  { id: 'shopping', label: 'Compras', system: false },
  { id: 'bills', label: 'Contas', system: false },
  { id: 'health', label: 'Saúde', system: false },
  { id: 'education', label: 'Educação', system: false },
  { id: 'entertainment', label: 'Lazer', system: false },
  { id: 'travel', label: 'Viagem', system: false },
  { id: 'adjustment', label: 'Ajuste', system: false },
  { id: 'transfer', label: 'Transferência', system: true },
  { id: 'other', label: 'Outros', system: false },
] as const

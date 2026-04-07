export type AccountType = 'bank' | 'wallet' | 'other'

export interface Account {
  id: string
  name: string
  type: AccountType
  isDefault: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface NewAccountInput {
  name: string
  type: AccountType
}

export interface UpdateAccountInput {
  name?: string
  type?: AccountType
  isArchived?: boolean
}

/** Edição completa da conta + saldo inicial (transação `opening_balance`). */
export interface UpdateAccountDetailsInput {
  name: string
  type: AccountType
  /** `null` ou `0` remove o saldo inicial; valor com sinal substitui ou cria o lançamento. */
  openingBalanceCents: number | null
  openingDate: string
}

export interface AccountOpeningSnapshot {
  amountCents: number | null
  date: string
}


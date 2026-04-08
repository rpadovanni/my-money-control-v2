import type { StateCreator } from 'zustand'
import { currentMonthYYYYMM } from '../../lib/dates'
import { transactionsRepo } from '../../lib/data/transactions.gateway'
import type { StoreState } from '../store-state'
import type {
  NewTransactionInput,
  Transaction,
  TransactionCategory,
  TransactionsFilters,
  TransactionType,
  UpdateTransactionInput,
} from '../types/transactions'

export interface TransactionsSliceState {
  ready: boolean
  items: Transaction[]
  categories: TransactionCategory[]
  filters: TransactionsFilters
}

export interface TransactionsSliceActions {
  transactionsInit: (opts?: { month?: string }) => Promise<void>
  setTransactionsMonth: (month: string) => Promise<void>
  setTransactionsType: (type: 'all' | TransactionType) => Promise<void>
  setTransactionsCategory: (category: string | null) => Promise<void>
  setTransactionsAccount: (accountId: string | 'all') => Promise<void>
  addTransaction: (input: NewTransactionInput) => Promise<void>
  updateTransaction: (id: string, patch: UpdateTransactionInput) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
}

export type TransactionsSlice = {
  transactions: TransactionsSliceState
} & TransactionsSliceActions

const DEFAULT_CATEGORIES: TransactionCategory[] = [
  { id: 'salary', label: 'Salário' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'food', label: 'Alimentação' },
  { id: 'transport', label: 'Transporte' },
  { id: 'shopping', label: 'Compras' },
  { id: 'bills', label: 'Contas' },
  { id: 'health', label: 'Saúde' },
  { id: 'education', label: 'Educação' },
  { id: 'entertainment', label: 'Lazer' },
  { id: 'travel', label: 'Viagem' },
  { id: 'transfer', label: 'Transferência' },
  { id: 'other', label: 'Outros' },
]

async function load(set: (fn: (s: StoreState) => StoreState) => void, get: () => StoreState) {
  const items = await transactionsRepo.list(get().transactions.filters)
  set((s) => ({ ...s, transactions: { ...s.transactions, items, ready: true } }))
}

async function afterTransactionMutation(
  set: (fn: (s: StoreState) => StoreState) => void,
  get: () => StoreState,
) {
  await load(set, get)
  await get().refreshAccountBalances()
}

export const createTransactionsSlice: StateCreator<StoreState, [], [], TransactionsSlice> = (set, get) => ({
  transactions: {
    ready: false,
    items: [],
    categories: DEFAULT_CATEGORIES,
    filters: { month: currentMonthYYYYMM(), type: 'all', category: null, accountId: 'all' },
  },

  transactionsInit: async (opts) => {
    if (opts?.month) {
      const month = opts.month
      set((s) => ({
        ...s,
        transactions: { ...s.transactions, ready: false, filters: { ...s.transactions.filters, month } },
      }))
    } else {
      set((s) => ({ ...s, transactions: { ...s.transactions, ready: false } }))
    }
    await load(set, get)
  },

  setTransactionsMonth: async (month) => {
    set((s) => ({
      ...s,
      transactions: { ...s.transactions, ready: false, filters: { ...s.transactions.filters, month } },
    }))
    await load(set, get)
  },

  setTransactionsType: async (type) => {
    set((s) => ({
      ...s,
      transactions: { ...s.transactions, ready: false, filters: { ...s.transactions.filters, type } },
    }))
    await load(set, get)
  },

  setTransactionsCategory: async (category) => {
    set((s) => ({
      ...s,
      transactions: { ...s.transactions, ready: false, filters: { ...s.transactions.filters, category } },
    }))
    await load(set, get)
  },

  setTransactionsAccount: async (accountId) => {
    set((s) => ({
      ...s,
      transactions: { ...s.transactions, ready: false, filters: { ...s.transactions.filters, accountId } },
    }))
    await load(set, get)
  },

  addTransaction: async (input) => {
    await transactionsRepo.add(input)
    await afterTransactionMutation(set, get)
  },

  updateTransaction: async (id, patch) => {
    await transactionsRepo.update(id, patch)
    await afterTransactionMutation(set, get)
  },

  deleteTransaction: async (id) => {
    await transactionsRepo.delete(id)
    await afterTransactionMutation(set, get)
  },
})

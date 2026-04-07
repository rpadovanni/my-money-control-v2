import type { StateCreator } from 'zustand'
import { transactionsRepo } from '../../lib/db/transactions.repo'
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
  { id: 'other', label: 'Outros' },
]

function currentMonthISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function load(set: (fn: (s: TransactionsSlice) => TransactionsSlice) => void, get: () => TransactionsSlice) {
  const items = await transactionsRepo.list(get().transactions.filters)
  set((s) => ({ ...s, transactions: { ...s.transactions, items, ready: true } }))
}

export const createTransactionsSlice: StateCreator<
  TransactionsSlice,
  [],
  [],
  TransactionsSlice
> = (set, get) => ({
  transactions: {
    ready: false,
    items: [],
    categories: DEFAULT_CATEGORIES,
    filters: { month: currentMonthISO(), type: 'all', category: null },
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

  addTransaction: async (input) => {
    await transactionsRepo.add(input)
    await load(set, get)
  },

  updateTransaction: async (id, patch) => {
    await transactionsRepo.update(id, patch)
    await load(set, get)
  },

  deleteTransaction: async (id) => {
    await transactionsRepo.delete(id)
    await load(set, get)
  },
})


import { create } from 'zustand'
import { currentMonthYYYYMM } from '../../../shared/lib/dates'
import { transactionsRepo } from '../../../shared/lib/data/transactions.gateway'
import type {
  NewTransactionInput,
  Transaction,
  TransactionsFilters,
  TransactionType,
  UpdateTransactionInput,
} from '../types/transactions'

export interface TransactionsSliceState {
  ready: boolean
  items: Transaction[]
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

export type TransactionsStore = { transactions: TransactionsSliceState } & TransactionsSliceActions

let onTransactionsMutated: () => Promise<void> = async () => {}

/** Ligado em `app/wire-finance-stores.ts` para atualizar saldos após mutações. */
export function setTransactionsCoordinator(onMutated: () => Promise<void>) {
  onTransactionsMutated = onMutated
}

async function load(
  set: (fn: (s: TransactionsStore) => Partial<TransactionsStore> | TransactionsStore) => void,
  get: () => TransactionsStore,
) {
  const items = await transactionsRepo.list(get().transactions.filters)
  set((s) => ({ transactions: { ...s.transactions, items, ready: true } }))
}

async function afterTransactionMutation(
  set: (fn: (s: TransactionsStore) => Partial<TransactionsStore> | TransactionsStore) => void,
  get: () => TransactionsStore,
) {
  await load(set, get)
  await onTransactionsMutated()
}

export const useTransactionsStore = create<TransactionsStore>()((set, get) => ({
  transactions: {
    ready: false,
    items: [],
    filters: { month: currentMonthYYYYMM(), type: 'all', category: null, accountId: 'all' },
  },

  transactionsInit: async (opts) => {
    if (opts?.month) {
      const month = opts.month
      set((s) => ({
        transactions: {
          ...s.transactions,
          ready: false,
          filters: { ...s.transactions.filters, month },
        },
      }))
    } else {
      set((s) => ({ transactions: { ...s.transactions, ready: false } }))
    }
    await load(set, get)
  },

  setTransactionsMonth: async (month) => {
    set((s) => ({
      transactions: { ...s.transactions, ready: false, filters: { ...s.transactions.filters, month } },
    }))
    await load(set, get)
  },

  setTransactionsType: async (type) => {
    set((s) => ({
      transactions: { ...s.transactions, ready: false, filters: { ...s.transactions.filters, type } },
    }))
    await load(set, get)
  },

  setTransactionsCategory: async (category) => {
    set((s) => ({
      transactions: {
        ...s.transactions,
        ready: false,
        filters: { ...s.transactions.filters, category },
      },
    }))
    await load(set, get)
  },

  setTransactionsAccount: async (accountId) => {
    set((s) => ({
      transactions: {
        ...s.transactions,
        ready: false,
        filters: { ...s.transactions.filters, accountId },
      },
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
}))

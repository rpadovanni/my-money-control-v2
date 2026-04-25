import { create } from 'zustand'
import { transactionsRepo } from '../../../shared/lib/data/transactions.gateway'
import type {
  NewTransactionInput,
  Transaction,
  TransactionsFilters,
  TransactionsPeriod,
  TransactionsSort,
  TransactionType,
  UpdateTransactionInput,
} from '../types/transactions'

export interface TransactionsSliceState {
  ready: boolean
  items: Transaction[]
  filters: TransactionsFilters
}

export interface TransactionsSliceActions {
  transactionsInit: () => Promise<void>
  setTransactionsPeriod: (period: TransactionsPeriod) => Promise<void>
  setTransactionsType: (type: 'all' | TransactionType) => Promise<void>
  setTransactionsCategory: (category: string | null) => Promise<void>
  setTransactionsAccount: (accountId: string | 'all') => Promise<void>
  setTransactionsSearch: (search: string) => Promise<void>
  setTransactionsSort: (sort: TransactionsSort) => Promise<void>
  resetTransactionsFilters: () => Promise<void>
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

function defaultTransactionsFilters(): TransactionsFilters {
  return {
    period: { kind: 'all' },
    type: 'all',
    category: null,
    accountId: 'all',
    search: '',
    sort: 'date_desc',
  }
}

export const useTransactionsStore = create<TransactionsStore>()((set, get) => ({
  transactions: {
    ready: false,
    items: [],
    filters: defaultTransactionsFilters(),
  },

  transactionsInit: async () => {
    set((s) => ({ transactions: { ...s.transactions, ready: false } }))
    await load(set, get)
  },

  setTransactionsPeriod: async (period) => {
    set((s) => ({
      transactions: {
        ...s.transactions,
        ready: false,
        filters: { ...s.transactions.filters, period },
      },
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

  setTransactionsSearch: async (search) => {
    set((s) => ({
      transactions: {
        ...s.transactions,
        ready: false,
        filters: { ...s.transactions.filters, search },
      },
    }))
    await load(set, get)
  },

  setTransactionsSort: async (sort) => {
    set((s) => ({
      transactions: {
        ...s.transactions,
        ready: false,
        filters: { ...s.transactions.filters, sort },
      },
    }))
    await load(set, get)
  },

  resetTransactionsFilters: async () => {
    set((s) => ({
      transactions: {
        ...s.transactions,
        ready: false,
        filters: defaultTransactionsFilters(),
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

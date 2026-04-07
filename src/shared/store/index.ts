import { create } from 'zustand'
import type { TransactionsSlice } from './slices/transactions.slice'
import { createTransactionsSlice } from './slices/transactions.slice'

export type StoreState = TransactionsSlice

export const useStore = create<StoreState>()((...a) => ({
  ...createTransactionsSlice(...a),
}))


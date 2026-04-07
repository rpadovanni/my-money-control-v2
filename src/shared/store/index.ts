import { create } from 'zustand'
import { createAccountsSlice } from './slices/accounts.slice'
import { createTransactionsSlice } from './slices/transactions.slice'
import type { StoreState } from './store-state'

export type { StoreState } from './store-state'

export const useStore = create<StoreState>()((...a) => ({
  ...createTransactionsSlice(...a),
  ...createAccountsSlice(...a),
}))

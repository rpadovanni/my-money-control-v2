export type StoreState =
  import('./slices/transactions.slice').TransactionsSlice & import('./slices/accounts.slice').AccountsSlice

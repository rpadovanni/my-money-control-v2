export type StoreState =
  import('./slices/auth.slice').AuthSlice &
  import('./slices/transactions.slice').TransactionsSlice &
  import('./slices/accounts.slice').AccountsSlice

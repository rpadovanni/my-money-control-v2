import { localTransactionsRepo } from '../db/transactions.repo'
import { isRemoteActive } from './data-source'
import { remoteTransactionsRepo } from './remote-transactions.repo'
import type {
  NewTransactionInput,
  Transaction,
  TransactionsFilters,
  UpdateTransactionInput,
} from '../../store/types/transactions'

/** Repositório de transações: Dexie local ou Supabase remoto conforme sessão. */
export const transactionsRepo = {
  list(filters: TransactionsFilters): Promise<Transaction[]> {
    return isRemoteActive() ? remoteTransactionsRepo.list(filters) : localTransactionsRepo.list(filters)
  },
  add(input: NewTransactionInput): Promise<Transaction> {
    return isRemoteActive() ? remoteTransactionsRepo.add(input) : localTransactionsRepo.add(input)
  },
  update(id: string, patch: UpdateTransactionInput): Promise<Transaction | null> {
    return isRemoteActive() ? remoteTransactionsRepo.update(id, patch) : localTransactionsRepo.update(id, patch)
  },
  delete(id: string): Promise<void> {
    return isRemoteActive() ? remoteTransactionsRepo.delete(id) : localTransactionsRepo.delete(id)
  },
  getOpeningBalanceForAccount(accountId: string): Promise<Transaction | null> {
    return isRemoteActive()
      ? remoteTransactionsRepo.getOpeningBalanceForAccount(accountId)
      : localTransactionsRepo.getOpeningBalanceForAccount(accountId)
  },
  setOpeningBalanceForAccount(
    accountId: string,
    amountCents: number | null,
    date: string,
  ): Promise<void> {
    return isRemoteActive()
      ? remoteTransactionsRepo.setOpeningBalanceForAccount(accountId, amountCents, date)
      : localTransactionsRepo.setOpeningBalanceForAccount(accountId, amountCents, date)
  },
  getBalancesCentsByAccountId(): Promise<Record<string, number>> {
    return isRemoteActive()
      ? remoteTransactionsRepo.getBalancesCentsByAccountId()
      : localTransactionsRepo.getBalancesCentsByAccountId()
  },
  getCreditCardPayablesForMonth(monthYYYYMM: string): Promise<Record<string, number>> {
    return isRemoteActive()
      ? remoteTransactionsRepo.getCreditCardPayablesForMonth(monthYYYYMM)
      : localTransactionsRepo.getCreditCardPayablesForMonth(monthYYYYMM)
  },
  countByCategory(categoryId: string): Promise<number> {
    return isRemoteActive()
      ? remoteTransactionsRepo.countByCategory(categoryId)
      : localTransactionsRepo.countByCategory(categoryId)
  },
}

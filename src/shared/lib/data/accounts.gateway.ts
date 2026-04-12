import { localAccountsRepo } from '../db/accounts.repo'
import { isRemoteActive } from './data-source'
import { remoteAccountsRepo } from './remote-accounts.repo'
import type { Account, NewAccountInput, UpdateAccountInput } from '../../../features/accounts/types/accounts'

/** Repositório de contas: Dexie quando não há sessão na nuvem; Supabase quando logado. */
export const accountsRepo = {
  list(opts?: { includeArchived?: boolean }): Promise<Account[]> {
    return isRemoteActive() ? remoteAccountsRepo.list(opts) : localAccountsRepo.list(opts)
  },
  listArchived(): Promise<Account[]> {
    return isRemoteActive() ? remoteAccountsRepo.listArchived() : localAccountsRepo.listArchived()
  },
  get(id: string): Promise<Account | null> {
    return isRemoteActive() ? remoteAccountsRepo.get(id) : localAccountsRepo.get(id)
  },
  getDefault(): Promise<Account | null> {
    return isRemoteActive() ? remoteAccountsRepo.getDefault() : localAccountsRepo.getDefault()
  },
  add(input: NewAccountInput & { makeDefault?: boolean }): Promise<Account> {
    return isRemoteActive() ? remoteAccountsRepo.add(input) : localAccountsRepo.add(input)
  },
  update(id: string, patch: UpdateAccountInput): Promise<Account | null> {
    return isRemoteActive() ? remoteAccountsRepo.update(id, patch) : localAccountsRepo.update(id, patch)
  },
  setDefault(id: string): Promise<void> {
    return isRemoteActive() ? remoteAccountsRepo.setDefault(id) : localAccountsRepo.setDefault(id)
  },
  archive(id: string): Promise<void> {
    return isRemoteActive() ? remoteAccountsRepo.archive(id) : localAccountsRepo.archive(id)
  },
  unarchive(id: string): Promise<void> {
    return isRemoteActive() ? remoteAccountsRepo.unarchive(id) : localAccountsRepo.unarchive(id)
  },
}

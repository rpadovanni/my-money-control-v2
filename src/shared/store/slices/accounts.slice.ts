import type { StateCreator } from 'zustand'
import { todayISODate } from '../../lib/dates'
import { accountsRepo } from '../../lib/db/accounts.repo'
import { transactionsRepo } from '../../lib/db/transactions.repo'
import type {
  Account,
  AccountOpeningSnapshot,
  NewAccountInput,
  UpdateAccountDetailsInput,
  UpdateAccountInput,
} from '../types/accounts'
import type { StoreState } from '../store-state'

export interface AccountsSliceState {
  ready: boolean
  items: Account[]
  archivedItems: Account[]
  /** Saldo acumulado por `accountId` (centavos). */
  balancesByAccountId: Record<string, number>
}

export interface AddAccountInput extends NewAccountInput {
  makeDefault?: boolean
  openingBalanceCents?: number
  openingDate?: string
}

export interface AccountsSliceActions {
  accountsInit: () => Promise<void>
  addAccount: (input: AddAccountInput) => Promise<void>
  updateAccount: (id: string, patch: UpdateAccountInput) => Promise<void>
  setDefaultAccount: (id: string) => Promise<void>
  archiveAccount: (id: string) => Promise<void>
  unarchiveAccount: (id: string) => Promise<void>
  getAccountOpeningForEdit: (accountId: string) => Promise<AccountOpeningSnapshot>
  updateAccountDetails: (id: string, input: UpdateAccountDetailsInput) => Promise<void>
  refreshAccountBalances: () => Promise<void>
}

export type AccountsSlice = {
  accounts: AccountsSliceState
} & AccountsSliceActions

async function loadAccounts(set: (fn: (s: StoreState) => StoreState) => void) {
  const [items, archivedItems, balancesByAccountId] = await Promise.all([
    accountsRepo.list(),
    accountsRepo.listArchived(),
    transactionsRepo.getBalancesCentsByAccountId(),
  ])
  set((s) => ({
    ...s,
    accounts: { ...s.accounts, items, archivedItems, balancesByAccountId, ready: true },
  }))
}

export const createAccountsSlice: StateCreator<StoreState, [], [], AccountsSlice> = (set, get) => ({
  accounts: {
    ready: false,
    items: [],
    archivedItems: [],
    balancesByAccountId: {},
  },

  accountsInit: async () => {
    set((s) => ({ ...s, accounts: { ...s.accounts, ready: false } }))
    await loadAccounts(set)
  },

  addAccount: async (input) => {
    const acc = await accountsRepo.add({
      name: input.name,
      type: input.type,
      makeDefault: input.makeDefault,
    })

    if (input.openingBalanceCents != null && input.openingBalanceCents !== 0) {
      const openingDate = input.openingDate ?? todayISODate()

      await transactionsRepo.add({
        type: 'income',
        kind: 'opening_balance',
        accountId: acc.id,
        amountCents: input.openingBalanceCents,
        date: openingDate,
        category: 'other',
        description: 'Saldo inicial',
      })
    }

    await loadAccounts(set)
    await get().transactionsInit({ month: get().transactions.filters.month })
  },

  updateAccount: async (id, patch) => {
    await accountsRepo.update(id, patch)
    await loadAccounts(set)
  },

  setDefaultAccount: async (id) => {
    await accountsRepo.setDefault(id)
    await loadAccounts(set)
  },

  archiveAccount: async (id) => {
    const active = await accountsRepo.list()
    if (active.length <= 1) return

    const acc = await accountsRepo.get(id)
    if (!acc || acc.isArchived) return

    if (acc.isDefault) {
      const candidate = active.find((a) => a.id !== id)
      if (candidate) await accountsRepo.setDefault(candidate.id)
    }

    await accountsRepo.archive(id)
    await loadAccounts(set)

    const filterId = get().transactions.filters.accountId
    if (filterId !== 'all' && filterId === id) {
      await get().setTransactionsAccount('all')
    } else {
      await get().transactionsInit({ month: get().transactions.filters.month })
    }
  },

  unarchiveAccount: async (id) => {
    const acc = await accountsRepo.get(id)
    if (!acc || !acc.isArchived) return

    await accountsRepo.unarchive(id)
    await loadAccounts(set)
    await get().transactionsInit({ month: get().transactions.filters.month })
  },

  getAccountOpeningForEdit: async (accountId) => {
    const t = await transactionsRepo.getOpeningBalanceForAccount(accountId)
    return {
      amountCents: t?.amountCents ?? null,
      date: t?.date ?? todayISODate(),
    }
  },

  updateAccountDetails: async (id, input) => {
    const acc = await accountsRepo.get(id)
    if (!acc) return

    await accountsRepo.update(id, { name: input.name, type: input.type })
    await transactionsRepo.setOpeningBalanceForAccount(id, input.openingBalanceCents, input.openingDate)
    await loadAccounts(set)
    await get().transactionsInit({ month: get().transactions.filters.month })
  },

  refreshAccountBalances: async () => {
    const balancesByAccountId = await transactionsRepo.getBalancesCentsByAccountId()
    set((s) => ({ ...s, accounts: { ...s.accounts, balancesByAccountId } }))
  },
})

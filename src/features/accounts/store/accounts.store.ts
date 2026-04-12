import { create } from 'zustand'
import { currentMonthYYYYMM, todayISODate } from '../../../shared/lib/dates'
import { accountsRepo } from '../../../shared/lib/data/accounts.gateway'
import { transactionsRepo } from '../../../shared/lib/data/transactions.gateway'
import type {
  Account,
  AccountOpeningSnapshot,
  NewAccountInput,
  UpdateAccountDetailsInput,
  UpdateAccountInput,
} from '../types/accounts'

export interface AccountsSliceState {
  ready: boolean
  items: Account[]
  archivedItems: Account[]
  /** Saldo acumulado por `accountId` (centavos). */
  balancesByAccountId: Record<string, number>
  /** “A pagar” no mês civil atual, por cartão (`credit_card`). */
  creditCardPayableByAccountId: Record<string, number>
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

export type AccountsStore = { accounts: AccountsSliceState } & AccountsSliceActions

export interface AccountsCoordinators {
  reloadTransactions: (opts?: { month?: string }) => Promise<void>
  getTransactionMonth: () => string
  getTransactionAccountFilter: () => string | 'all'
  setTransactionAccountFilter: (accountId: string | 'all') => Promise<void>
}

const noopCoords: AccountsCoordinators = {
  reloadTransactions: async () => {},
  getTransactionMonth: () => currentMonthYYYYMM(),
  getTransactionAccountFilter: () => 'all',
  setTransactionAccountFilter: async () => {},
}

let accountsCoordinators: AccountsCoordinators = noopCoords

/** Ligado em `app/wire-finance-stores.ts` para sincronizar filtros/lista de transações. */
export function setAccountsCoordinators(coords: AccountsCoordinators) {
  accountsCoordinators = coords
}

async function loadAccounts(
  set: (fn: (s: AccountsStore) => Partial<AccountsStore> | AccountsStore) => void,
) {
  const month = currentMonthYYYYMM()
  const [items, archivedItems, balancesByAccountId, creditCardPayableByAccountId] = await Promise.all([
    accountsRepo.list(),
    accountsRepo.listArchived(),
    transactionsRepo.getBalancesCentsByAccountId(),
    transactionsRepo.getCreditCardPayablesForMonth(month),
  ])
  set((s) => ({
    accounts: {
      ...s.accounts,
      items,
      archivedItems,
      balancesByAccountId,
      creditCardPayableByAccountId,
      ready: true,
    },
  }))
}

export const useAccountsStore = create<AccountsStore>()((set) => ({
  accounts: {
    ready: false,
    items: [],
    archivedItems: [],
    balancesByAccountId: {},
    creditCardPayableByAccountId: {},
  },

  accountsInit: async () => {
    set((s) => ({ accounts: { ...s.accounts, ready: false } }))
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
    await accountsCoordinators.reloadTransactions({ month: accountsCoordinators.getTransactionMonth() })
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

    const filterId = accountsCoordinators.getTransactionAccountFilter()
    if (filterId !== 'all' && filterId === id) {
      await accountsCoordinators.setTransactionAccountFilter('all')
    } else {
      await accountsCoordinators.reloadTransactions({ month: accountsCoordinators.getTransactionMonth() })
    }
  },

  unarchiveAccount: async (id) => {
    const acc = await accountsRepo.get(id)
    if (!acc || !acc.isArchived) return

    await accountsRepo.unarchive(id)
    await loadAccounts(set)
    await accountsCoordinators.reloadTransactions({ month: accountsCoordinators.getTransactionMonth() })
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
    await accountsCoordinators.reloadTransactions({ month: accountsCoordinators.getTransactionMonth() })
  },

  refreshAccountBalances: async () => {
    const month = currentMonthYYYYMM()
    const [balancesByAccountId, creditCardPayableByAccountId] = await Promise.all([
      transactionsRepo.getBalancesCentsByAccountId(),
      transactionsRepo.getCreditCardPayablesForMonth(month),
    ])
    set((s) => ({
      accounts: { ...s.accounts, balancesByAccountId, creditCardPayableByAccountId },
    }))
  },
}))

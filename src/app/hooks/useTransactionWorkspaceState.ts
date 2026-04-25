import { useMemo, useState } from 'react'
import { useAccountsStore } from '../../features/accounts/store/accounts.store'
import { useCategoriesStore } from '../../features/categories/store/categories.store'

/**
 * Estado partilhado entre formulário e lista de transações (layout em secções distintas)
 * e listas derivadas para selects — sem importar outras features nos componentes de transação.
 */
export function useTransactionWorkspaceState() {
  const accounts = useAccountsStore((s) => s.accounts.items)
  const archivedAccounts = useAccountsStore((s) => s.accounts.archivedItems)
  const categories = useCategoriesStore((s) => s.categories.items)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [submittingTx, setSubmittingTx] = useState(false)

  const txAccountsPicker = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        name: a.name,
        isDefault: a.isDefault,
        type: a.type,
      })),
    [accounts],
  )
  const txArchivedPicker = useMemo(
    () => archivedAccounts.map((a) => ({ id: a.id, name: a.name })),
    [archivedAccounts],
  )
  const txCategoriesPicker = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        label: c.label,
        type: c.type,
        system: c.system,
      })),
    [categories],
  )
  const filterAccounts = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        name: a.name,
        isDefault: a.isDefault,
      })),
    [accounts],
  )
  const filterCategories = useMemo(
    () => categories.map((c) => ({ id: c.id, label: c.label })),
    [categories],
  )

  return {
    editingId,
    setEditingId,
    submittingTx,
    setSubmittingTx,
    txAccountsPicker,
    txArchivedPicker,
    txCategoriesPicker,
    filterAccounts,
    filterCategories,
  }
}

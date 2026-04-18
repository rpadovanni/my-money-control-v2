import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccountsStore } from '../../features/accounts/store/accounts.store'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { useCategoriesStore } from '../../features/categories/store/categories.store'
import { useTransactionsStore } from '../../features/transactions/store/transactions.store'
import { migrateLocalDexieToCloud } from '../../shared/lib/data/migrate-local-to-cloud'
import { errMessage } from '../../shared/utils/error-message'

/**
 * Avisos globais (notice), toasts e fluxo de migração local→nuvem.
 */
export function useDashboardFeedback() {
  const authSession = useAuthStore((s) => s.auth.session)
  const month = useTransactionsStore((s) => s.transactions.filters.month)
  const initAcc = useAccountsStore((s) => s.accountsInit)
  const initTx = useTransactionsStore((s) => s.transactionsInit)
  const initCat = useCategoriesStore((s) => s.categoriesInit)

  const [notice, setNotice] = useState<null | { variant: 'error'; message: string }>(null)
  const [toast, setToast] = useState<null | { id: number; variant: 'success' | 'error'; message: string }>(
    null,
  )
  const toastSeq = useRef(0)
  const toastTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    const timeouts = toastTimeoutsRef.current
    return () => {
      for (const tid of timeouts) clearTimeout(tid)
      timeouts.clear()
    }
  }, [])

  const pushToast = useCallback((variant: 'success' | 'error', message: string, durationMs?: number) => {
    const id = ++toastSeq.current
    setToast({ id, variant, message })
    const ms = durationMs ?? (variant === 'error' ? 5200 : 3200)
    const tid = window.setTimeout(() => {
      toastTimeoutsRef.current.delete(tid)
      setToast((t) => (t?.id === id ? null : t))
    }, ms)
    toastTimeoutsRef.current.add(tid)
  }, [])

  const [migratingLocal, setMigratingLocal] = useState(false)

  const onMigrateLocalToCloud = useCallback(async () => {
    const uid = authSession?.user?.id
    if (!uid || migratingLocal) return
    setMigratingLocal(true)
    setNotice(null)
    try {
      const r = await migrateLocalDexieToCloud()
      pushToast(
        'success',
        r.accounts + r.transactions === 0
          ? 'Não havia dados locais novos para enviar.'
          : `Enviadas ${r.accounts} conta(s) e ${r.transactions} transação(ões).`,
        6500,
      )
      await initAcc()
      await initTx({ month })
      await initCat()
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setMigratingLocal(false)
    }
  }, [authSession?.user?.id, migratingLocal, month, initAcc, initTx, initCat, pushToast])

  return {
    notice,
    setNotice,
    toast,
    pushToast,
    migratingLocal,
    onMigrateLocalToCloud,
  }
}

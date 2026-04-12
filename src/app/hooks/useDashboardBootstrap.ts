import { useEffect, useRef } from 'react'
import { useAccountsStore } from '../../features/accounts/store/accounts.store'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { useCategoriesStore } from '../../features/categories/store/categories.store'
import { useTransactionsStore } from '../../features/transactions/store/transactions.store'
import { currentMonthYYYYMM } from '../../shared/lib/dates'

/**
 * Garante init de contas / transações / categorias uma vez por “fonte de dados”
 * (local vs utilizador na nuvem), após auth estar resolvida.
 */
export function useDashboardBootstrap() {
  const authStatus = useAuthStore((s) => s.auth.status)
  const authSession = useAuthStore((s) => s.auth.session)
  const initTx = useTransactionsStore((s) => s.transactionsInit)
  const initAcc = useAccountsStore((s) => s.accountsInit)
  const initCat = useCategoriesStore((s) => s.categoriesInit)
  const initDataRef = useRef<string | null>(null)

  useEffect(() => {
    if (authStatus !== 'signedIn' && authStatus !== 'signedOut') return
    const key = authSession?.user?.id ? `cloud:${authSession.user.id}` : 'local'
    if (initDataRef.current === key) return
    initDataRef.current = key
    void initAcc()
    void initTx({ month: currentMonthYYYYMM() })
    void initCat()
  }, [authStatus, authSession?.user?.id, initAcc, initTx, initCat])
}

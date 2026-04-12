import {
  setAccountsCoordinators,
  useAccountsStore,
} from '../features/accounts/store/accounts.store'
import {
  setTransactionsCoordinator,
  useTransactionsStore,
} from '../features/transactions/store/transactions.store'

/**
 * Ligação explícita entre stores de domínio (camada `app/`, não feature→feature).
 *
 * **Porque existe:** Zustand por feature evita um store global, mas contas e transações
 * precisam reagir um ao outro (saldos após mutação de transações; reload da lista ao
 * arquivar conta com filtro ativo). Importar stores entre features violaria o isolamento.
 *
 * **Quando executar:** uma vez na arranque da SPA, antes do primeiro render que use dados
 * financeiros — hoje em `main.tsx` via `wireFinanceStores()` (antes de `createRoot`).
 * Em testes ou novos entrypoints, chamar o mesmo de forma síncrona no setup.
 *
 * **O que é permitido aqui:** apenas delegação — chamar métodos públicos dos stores
 * (`refreshAccountBalances`, `transactionsInit`, leitura de filtros). Sem regras de negócio,
 * sem transformação de dados de domínio, sem I/O.
 *
 * **Quando rever:** se surgirem mais pares acoplados, avaliar um único módulo de bootstrap
 * ou eventos de domínio; até lá manter este ficheiro mínimo.
 */
export function wireFinanceStores() {
  setTransactionsCoordinator(async () => {
    await useAccountsStore.getState().refreshAccountBalances()
  })

  setAccountsCoordinators({
    reloadTransactions: (opts) => useTransactionsStore.getState().transactionsInit(opts),
    getTransactionMonth: () => useTransactionsStore.getState().transactions.filters.month,
    getTransactionAccountFilter: () => useTransactionsStore.getState().transactions.filters.accountId,
    setTransactionAccountFilter: (accountId) =>
      useTransactionsStore.getState().setTransactionsAccount(accountId),
  })
}

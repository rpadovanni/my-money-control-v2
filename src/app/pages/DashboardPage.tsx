/**
 * Página única do dashboard: o `pathname` define a “vista” (início, contas,
 * transações, categorias). O layout (`LoggedInLayout`) é comum; o conteúdo
 * central muda por rota:
 *
 * - `/` (Início) — resumo geral: KPIs (placeholder) + lista de transações
 *   recentes (somente leitura, com link «Ver todas»).
 * - `/transactions` — filtros + resumo mensal + formulário + lista com
 *   editar/excluir.
 * - `/accounts` — contas (CRUD, transferências, “Pagar fatura”).
 * - `/categories` — categorias (CRUD).
 */
import { useMemo, useState } from "react";
import {
  ArrowUp,
  CreditCard,
  Download,
  Inbox,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { AccountsCard } from "../../features/accounts/components/AccountsCard";
import { AccountsSummaryMetrics } from "../../features/accounts/components/AccountsSummaryMetrics";
import { AccountFormDialog } from "../../features/accounts/components/AccountFormDialog";
import { useAuthStore } from "../../features/auth/store/auth.store";
import type {
  Account,
  AccountType,
} from "../../features/accounts/types/accounts";
import { CategoriesSection } from "../../features/categories/components/CategoriesSection";
import {
  CategoryFormDialog,
  type EditingCategory,
} from "../../features/categories/components/CategoryFormDialog";
import { useCategoriesStore } from "../../features/categories/store/categories.store";
import { TransactionFilters } from "../../features/transactions/components/TransactionFilters";
import { TransactionFormDialog } from "../../features/transactions/components/TransactionFormDialog";
import { TransactionList } from "../../features/transactions/components/TransactionList";
import { TransactionsListSection } from "../../features/transactions/components/TransactionsListSection";
import { TransactionsSummary } from "../../features/transactions/components/TransactionsSummary";
import { useTransactionListItems } from "../../features/transactions/hooks/useTransactionListItems";
import { useTransactionsStore } from "../../features/transactions/store/transactions.store";
import { isSupabaseConfigured } from "../../shared/lib/supabase/client";
import { DashboardHomeMetrics } from "../components/DashboardHomeMetrics";
import { LoggedInLayout } from "../components/LoggedInLayout";
import { useDashboardBootstrap } from "../hooks/useDashboardBootstrap";
import { useDashboardFeedback } from "../hooks/useDashboardFeedback";
import { useDashboardShell } from "../hooks/useDashboardShell";
import { useTransactionWorkspaceState } from "../hooks/useTransactionWorkspaceState";

type DashboardView = "home" | "accounts" | "transactions" | "categories";

const HOME_TX_PREVIEW_LIMIT = 8;

function viewFromPathname(pathname: string): DashboardView {
  if (pathname === "/accounts") return "accounts";
  if (pathname === "/transactions") return "transactions";
  if (pathname === "/categories") return "categories";
  return "home";
}

const LAYOUT_PAGE: Record<DashboardView, { title: string; subtitle?: string }> =
  {
    home: {
      title: "Dashboard",
      subtitle: "Visão geral das suas finanças",
    },
    transactions: {
      title: "Transações",
      subtitle: "Gerencie todas as suas movimentações financeiras",
    },
    accounts: {
      title: "Contas e Cartões",
      subtitle: "Gerencie suas contas bancárias e cartões de crédito",
    },
    categories: {
      title: "Categorias",
      subtitle: "Gerencie as categorias de receitas e despesas",
    },
  };

function HomeEmptyState() {
  return (
    <>
      <Inbox className="mx-auto size-12 opacity-40" aria-hidden />
      <p className="mt-2 font-semibold text-base-content">
        Nenhuma transação no mês corrente
      </p>
      <p className="text-sm text-base-content/70">
        Use “Nova transação” para registrar lançamentos e acompanhar seus
        indicadores.
      </p>
    </>
  );
}

function TransactionsEmptyState() {
  return (
    <>
      <Inbox className="mx-auto size-12 opacity-40" aria-hidden />
      <p className="mt-2 font-semibold text-base-content">
        Nenhuma transação neste período
      </p>
      <p className="text-sm text-base-content/70">
        Ajuste os filtros aplicados ou clique em «Nova transação» no topo da
        página.
      </p>
    </>
  );
}

export function DashboardPage() {
  // Carrega dados iniciais (stores / auth) uma vez na montagem.
  useDashboardBootstrap();

  const location = useLocation();
  const view = viewFromPathname(location.pathname);
  const page = LAYOUT_PAGE[view];

  // --- Auth & modo nuvem (para o alerta condicional de categorias) ---
  const authStatus = useAuthStore((s) => s.auth.status);
  const authSession = useAuthStore((s) => s.auth.session);
  const usingCloud =
    isSupabaseConfigured() &&
    authStatus === "signedIn" &&
    Boolean(authSession?.user);

  // --- Prontidão das stores (apenas para o erro de categorias na nuvem) ---
  const catReady = useCategoriesStore((s) => s.categories.ready);
  const categoriesInitError = useCategoriesStore((s) => s.categories.initError);
  const initCat = useCategoriesStore((s) => s.categoriesInit);

  // Necessário para a vista de Início (preview de transações) e para o
  // botão de transferência dentro da `AccountsCard`.
  const txRows = useTransactionsStore((s) => s.transactions.items);
  const addTransaction = useTransactionsStore((s) => s.addTransaction);

  // --- Shell: scroll, PWA, offline ---
  const {
    online,
    showScrollTop,
    showPwaInstallChrome,
    onPwaInstallClick,
    dismissPwaInstall,
  } = useDashboardShell();

  // --- Avisos, toast, migração local → nuvem ---
  const {
    notice,
    setNotice,
    toast,
    pushToast,
    migratingLocal,
    onMigrateLocalToCloud,
  } = useDashboardFeedback();

  // --- Formulário / lista de transações (estado partilhado no workspace) ---
  const {
    editingId,
    setEditingId,
    submittingTx,
    setSubmittingTx,
    txAccountsPicker,
    txArchivedPicker,
    txCategoriesPicker,
    filterAccounts,
    filterCategories,
  } = useTransactionWorkspaceState();

  // --- Modal de transação (criar) e contas (criar/editar) ---
  // O modal de transação abre quando o utilizador clica em «Nova transação»
  // no topo da página ou em «Editar» numa linha (que define `editingId`).
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const transactionDialogOpen = creatingTransaction || editingId !== null;
  function closeTransactionDialog() {
    setCreatingTransaction(false);
    setEditingId(null);
  }

  const [accountDialog, setAccountDialog] = useState<
    | null
    | { mode: "create"; defaultType: AccountType }
    | { mode: "edit"; account: Account }
  >(null);
  function closeAccountDialog() {
    setAccountDialog(null);
  }

  const [categoryDialog, setCategoryDialog] = useState<
    null | { mode: "create" } | { mode: "edit"; category: EditingCategory }
  >(null);
  function closeCategoryDialog() {
    setCategoryDialog(null);
  }

  // Preview da Home: transações do mês corrente (filtro inicial do store)
  // limitadas a `HOME_TX_PREVIEW_LIMIT`. O hook está sempre presente
  // (regras dos hooks); o resultado só é renderizado em `/`.
  const allListItems = useTransactionListItems(
    txRows,
    txAccountsPicker,
    txArchivedPicker,
    txCategoriesPicker,
  );
  const homePreview = useMemo(
    () => allListItems.slice(0, HOME_TX_PREVIEW_LIMIT),
    [allListItems],
  );

  // Acções específicas da página (canto superior direito).
  let headerActions: React.ReactNode = null;
  if (view === "transactions") {
    headerActions = (
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => {
          setEditingId(null);
          setCreatingTransaction(true);
        }}
      >
        <Plus className="size-4" aria-hidden />
        <span>Nova transação</span>
      </button>
    );
  } else if (view === "accounts") {
    headerActions = (
      <>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() =>
            setAccountDialog({ mode: "create", defaultType: "bank" })
          }
        >
          <Plus className="size-4" aria-hidden />
          <span>Adicionar conta</span>
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() =>
            setAccountDialog({ mode: "create", defaultType: "credit_card" })
          }
        >
          <CreditCard className="size-4" aria-hidden />
          <span>Adicionar cartão</span>
        </button>
      </>
    );
  } else if (view === "categories") {
    headerActions = (
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={Boolean(categoriesInitError)}
        onClick={() => setCategoryDialog({ mode: "create" })}
      >
        <Plus className="size-4" aria-hidden />
        <span>Nova categoria</span>
      </button>
    );
  }

  return (
    <LoggedInLayout
      online={online}
      migratingLocal={migratingLocal}
      onMigrateLocalToCloud={() => void onMigrateLocalToCloud()}
      pageTitle={page.title}
      pageSubtitle={page.subtitle}
      headerActions={headerActions}
    >
      {/* Erro global (ex.: falha ao gravar) */}
      {notice ? (
        <div className="alert alert-error mb-4" role="alert" aria-live="polite">
          <span>{notice.message}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => setNotice(null)}
            aria-label="Fechar aviso"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {/* Nuvem: falha ao carregar categorias */}
      {usingCloud && categoriesInitError ? (
        <div className="alert alert-error mb-4" role="alert" aria-live="polite">
          <span>{categoriesInitError}</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!catReady}
            onClick={() => void initCat()}
          >
            {!catReady ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            <span>Tentar novamente</span>
          </button>
        </div>
      ) : null}

      {/* Início: KPIs + transações recentes (só leitura) */}
      {view === "home" ? (
        <>
          <DashboardHomeMetrics />
          <div className="mt-4">
            <TransactionList
              items={homePreview}
              seeAllHref="/transactions"
              emptySlot={<HomeEmptyState />}
            />
          </div>
        </>
      ) : null}

      {/* Transações: filtros + resumo + lista (formulário em modal) */}
      {view === "transactions" ? (
        <div className="flex flex-col gap-4">
          <TransactionFilters
            accounts={filterAccounts}
            categories={filterCategories}
          />
          <TransactionsSummary />
          <TransactionsListSection
            accounts={txAccountsPicker}
            archivedAccounts={txArchivedPicker}
            categories={txCategoriesPicker}
            pushToast={pushToast}
            setNotice={setNotice}
            editingId={editingId}
            setEditingId={setEditingId}
            setSubmittingTx={setSubmittingTx}
            emptySlot={<TransactionsEmptyState />}
          />
        </div>
      ) : null}

      {/* Contas: CRUD + transferências + “Pagar fatura” (formulário em modal) */}
      {view === "accounts" ? (
        <div className="flex flex-col gap-4">
          <AccountsSummaryMetrics />
          <AccountsCard
            onAddTransfer={(input) => addTransaction(input)}
            pushToast={pushToast}
            setNotice={setNotice}
            onEditAccount={(account) =>
              setAccountDialog({ mode: "edit", account })
            }
          />
        </div>
      ) : null}

      {/* Modal partilhado: nova/editar transação */}
      <TransactionFormDialog
        open={transactionDialogOpen}
        onClose={closeTransactionDialog}
        accounts={txAccountsPicker}
        archivedAccounts={txArchivedPicker}
        categories={txCategoriesPicker}
        categoriesReady={catReady}
        pushToast={pushToast}
        setNotice={setNotice}
        editingId={editingId}
        submittingTx={submittingTx}
        setSubmittingTx={setSubmittingTx}
      />

      {/* Modal partilhado: nova/editar categoria */}
      <CategoryFormDialog
        open={categoryDialog !== null}
        mode={categoryDialog?.mode ?? "create"}
        editingCategory={
          categoryDialog?.mode === "edit" ? categoryDialog.category : null
        }
        onClose={closeCategoryDialog}
        pushToast={pushToast}
      />

      {/* Modal partilhado: nova/editar conta (ou cartão) */}
      <AccountFormDialog
        open={accountDialog !== null}
        mode={accountDialog?.mode ?? "create"}
        defaultType={
          accountDialog?.mode === "create" ? accountDialog.defaultType : "bank"
        }
        editingAccount={
          accountDialog?.mode === "edit" ? accountDialog.account : null
        }
        onClose={closeAccountDialog}
        pushToast={pushToast}
        setNotice={setNotice}
      />

      {/* Categorias (formulário em modal) */}
      {view === "categories" ? (
        <CategoriesSection
          pushToast={pushToast}
          onEditCategory={(category) =>
            setCategoryDialog({ mode: "edit", category })
          }
        />
      ) : null}

      {/* Feedback efémero (toast) */}
      {toast ? (
        <div
          className="toast toast-center toast-bottom z-[150]"
          role="status"
          aria-live="polite"
        >
          <div
            className={`alert ${toast.variant === "success" ? "alert-success" : "alert-error"}`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      ) : null}

      {/* Flutuantes globais da página */}
      {showScrollTop ? (
        <button
          type="button"
          className="btn btn-circle btn-ghost fixed bottom-4 right-4 z-[130]"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Voltar ao topo"
          title="Topo"
          style={showPwaInstallChrome ? { bottom: "5.75rem" } : undefined}
        >
          <ArrowUp className="size-4" aria-hidden />
        </button>
      ) : null}

      {showPwaInstallChrome ? (
        <div
          className="fixed bottom-4 left-4 right-4 z-[140] rounded-box border border-base-300 bg-base-100 p-4 shadow"
          role="region"
          aria-label="Instalar aplicativo"
        >
          <p className="m-0 mb-3 text-base-content/80">
            Adicione à tela inicial para abrir mais rápido, como um app.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={dismissPwaInstall}
            >
              <X className="size-4" aria-hidden />
              <span>Agora não</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void onPwaInstallClick()}
            >
              <Download className="size-4" aria-hidden />
              <span>Instalar</span>
            </button>
          </div>
        </div>
      ) : null}
    </LoggedInLayout>
  );
}

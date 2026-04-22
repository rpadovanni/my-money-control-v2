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
import { useMemo } from "react";
import { ArrowUp, Download, Inbox, Loader2, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { AccountsCard } from "../../features/accounts/components/AccountsCard";
import { useAuthStore } from "../../features/auth/store/auth.store";
import { CategoriesSection } from "../../features/categories/components/CategoriesSection";
import { useCategoriesStore } from "../../features/categories/store/categories.store";
import { TransactionFiltersAndSummary } from "../../features/transactions/components/TransactionFiltersAndSummary";
import { TransactionFormCard } from "../../features/transactions/components/TransactionFormCard";
import { TransactionList } from "../../features/transactions/components/TransactionList";
import { TransactionsListSection } from "../../features/transactions/components/TransactionsListSection";
import { useTransactionListItems } from "../../features/transactions/hooks/useTransactionListItems";
import { useTransactionsStore } from "../../features/transactions/store/transactions.store";
import { isSupabaseConfigured } from "../../shared/lib/supabase/client";
import { DashboardHomeMetricsPlaceholder } from "../components/DashboardHomeMetricsPlaceholder";
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
    transactions: { title: "Transações" },
    accounts: { title: "Contas" },
    categories: { title: "Categorias" },
  };

function HomeEmptyState() {
  return (
    <>
      <Inbox className="mx-auto size-12 opacity-40" aria-hidden />
      <p className="mt-2 font-semibold text-base-content">
        Nenhuma transação no mês corrente
      </p>
      <p className="text-sm text-base-content/70">
        Use “Transações” no menu para registar lançamentos ou alterar o mês.
      </p>
    </>
  );
}

function TransactionsEmptyState({
  formPlacement,
}: {
  formPlacement: "aside" | "above";
}) {
  return (
    <>
      <Inbox className="mx-auto size-12 opacity-40" aria-hidden />
      <p className="mt-2 font-semibold text-base-content">
        Nenhuma transação neste período
      </p>
      <p className="text-sm text-base-content/70">
        Ajuste mês, conta ou tipo nos filtros — ou inclua um lançamento{" "}
        {formPlacement === "aside"
          ? "no formulário ao lado"
          : "no formulário acima"}
        .
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

  return (
    <LoggedInLayout
      online={online}
      migratingLocal={migratingLocal}
      onMigrateLocalToCloud={() => void onMigrateLocalToCloud()}
      pageTitle={page.title}
      pageSubtitle={page.subtitle}
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
          <DashboardHomeMetricsPlaceholder />
          <div className="mt-4">
            <TransactionList
              items={homePreview}
              seeAllHref="/transactions"
              emptySlot={<HomeEmptyState />}
            />
          </div>
        </>
      ) : null}

      {/* Transações: filtros + resumo + formulário + lista com ações */}
      {view === "transactions" ? (
        <div className="flex flex-col gap-4">
          <TransactionFiltersAndSummary
            accounts={filterAccounts}
            categories={filterCategories}
          />
          <section className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
            <TransactionFormCard
              accounts={txAccountsPicker}
              archivedAccounts={txArchivedPicker}
              categories={txCategoriesPicker}
              categoriesReady={catReady}
              pushToast={pushToast}
              setNotice={setNotice}
              editingId={editingId}
              setEditingId={setEditingId}
              submittingTx={submittingTx}
              setSubmittingTx={setSubmittingTx}
            />
            <TransactionsListSection
              accounts={txAccountsPicker}
              archivedAccounts={txArchivedPicker}
              categories={txCategoriesPicker}
              pushToast={pushToast}
              setNotice={setNotice}
              editingId={editingId}
              setEditingId={setEditingId}
              setSubmittingTx={setSubmittingTx}
              emptySlot={<TransactionsEmptyState formPlacement="aside" />}
            />
          </section>
        </div>
      ) : null}

      {/* Contas: CRUD + transferências + “Pagar fatura” */}
      {view === "accounts" ? (
        <AccountsCard
          onAddTransfer={(input) => addTransaction(input)}
          pushToast={pushToast}
          setNotice={setNotice}
        />
      ) : null}

      {/* Categorias */}
      {view === "categories" ? (
        <CategoriesSection pushToast={pushToast} />
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

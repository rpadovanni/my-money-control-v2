import type { Session } from "@supabase/supabase-js";
import {
  CloudUpload,
  LayoutDashboard,
  Loader2,
  LogOut,
  Receipt,
  Tags,
  WalletCards,
  WifiOff,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { wasLocalDataMigratedForUser } from "../../shared/lib/data/migrate-local-to-cloud";
import { isSupabaseConfigured } from "../../shared/lib/supabase/client";

function navLinkClass(isActive: boolean) {
  return [
    "btn btn-sm btn-ghost gap-2 rounded-full no-underline",
    "border border-base-300 bg-base-100 text-base-content",
    "hover:bg-base-200",
    isActive && "btn-active btn-primary text-primary-content border-primary",
  ]
    .filter(Boolean)
    .join(" ");
}

export function DashboardChrome({
  online,
  usingCloud,
  authReady,
  ready,
  authSession,
  migratingLocal,
  onMigrateLocalToCloud,
  onSignOut,
  view,
  children,
}: {
  online: boolean;
  usingCloud: boolean;
  authReady: boolean;
  ready: boolean;
  authSession: Session | null;
  migratingLocal: boolean;
  onMigrateLocalToCloud: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  view: "home" | "accounts" | "transactions" | "categories";
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl p-4 pb-12 pt-6">
      {!online ? (
        <div className="alert alert-warning mb-4" role="status">
          <WifiOff className="size-4" aria-hidden />
          <span>
            Você está offline. O app precisa de conexão para sincronizar com a
            nuvem.
          </span>
        </div>
      ) : null}
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Money Control</h1>
          <p className="text-base-content/70">
            {usingCloud
              ? "Dados na nuvem (Supabase). Requer conexão para alterações."
              : isSupabaseConfigured()
                ? "Dados neste aparelho (IndexedDB). Entre na nuvem para sincronizar entre dispositivos."
                : "Dados neste aparelho (IndexedDB). Opcional: variáveis VITE_SUPABASE_* para sync."}
          </p>
        </div>
        <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2 self-center">
          <div className="badge badge-outline">
            {!authReady
              ? "Sessão…"
              : ready
                ? usingCloud
                  ? "Nuvem"
                  : "Local"
                : "Carregando…"}
          </div>
          {isSupabaseConfigured() && authSession?.user ? (
            <div
              className="flex min-w-0 flex-wrap items-center gap-2"
              aria-label="Sessão na nuvem"
            >
              <span
                className="max-w-[160px] truncate text-xs leading-tight sm:max-w-[55vw] min-[900px]:max-w-[280px]"
                title={authSession.user.email ?? undefined}
              >
                {authSession.user.email}
              </span>
              <div className="flex shrink-0 flex-nowrap gap-1">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  disabled={
                    migratingLocal ||
                    wasLocalDataMigratedForUser(authSession.user.id) ||
                    !ready
                  }
                  onClick={() => void onMigrateLocalToCloud()}
                  aria-label={
                    wasLocalDataMigratedForUser(authSession.user.id)
                      ? "Dados deste aparelho já foram enviados para a nuvem"
                      : migratingLocal
                        ? "Enviando dados locais…"
                        : "Enviar dados locais para a nuvem"
                  }
                  title={
                    wasLocalDataMigratedForUser(authSession.user.id)
                      ? "Já enviado deste aparelho"
                      : migratingLocal
                        ? "Enviando…"
                        : "Enviar dados locais"
                  }
                >
                  {migratingLocal ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <CloudUpload className="size-4" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  onClick={() => void onSignOut()}
                  aria-label="Sair"
                  title="Sair"
                >
                  <LogOut className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <nav
        className="mb-4 flex flex-wrap gap-2.5"
        aria-label="Navegação principal"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <LayoutDashboard className="size-4" aria-hidden />
          <span>Início</span>
        </NavLink>
        <NavLink
          to="/transactions"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <Receipt className="size-4" aria-hidden />
          <span>Transações</span>
        </NavLink>
        <NavLink
          to="/accounts"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <WalletCards className="size-4" aria-hidden />
          <span>Contas</span>
        </NavLink>
        <NavLink
          to="/categories"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <Tags className="size-4" aria-hidden />
          <span>Categorias</span>
        </NavLink>
      </nav>

      {view !== "home" ? (
        <h2 className="mb-3 text-lg font-bold tracking-tight">
          {view === "transactions"
            ? "Transações"
            : view === "accounts"
              ? "Contas"
              : "Categorias"}
        </h2>
      ) : null}

      {children}
    </div>
  );
}

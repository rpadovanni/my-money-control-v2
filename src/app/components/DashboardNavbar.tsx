/**
 * Barra superior do dashboard autenticado: marca, links principais, estado
 * de ligação e menu da conta (nuvem). Em ecrãs estreitos os links migram
 * para um painel deslizante controlado por um botão hamburger.
 *
 * Lê estados puros das stores (auth/contas/categorias/transações) directamente.
 * Os valores que vêm de hooks com efeitos colaterais (`useDashboardShell` para
 * `online`, `useDashboardFeedback` para a migração) chegam por prop a partir do
 * `LoggedInLayout`, para que esses hooks rodem **uma só vez** no shell.
 */
import { useRef, useState } from "react";
import {
  ChevronDown,
  CloudUpload,
  Home,
  Landmark,
  List,
  Loader2,
  LogOut,
  Menu,
  Tag,
  User,
  Wallet,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/auth.store";
import { useAccountsStore } from "../../features/accounts/store/accounts.store";
import { useCategoriesStore } from "../../features/categories/store/categories.store";
import { useTransactionsStore } from "../../features/transactions/store/transactions.store";
import { Badge } from "../../shared/components/ui/Badge";
import { wasLocalDataMigratedForUser } from "../../shared/lib/data/migrate-local-to-cloud";
import { isSupabaseConfigured } from "../../shared/lib/supabase/client";
import { cn } from "../../shared/utils/cn";

export type DashboardNavbarProps = {
  online: boolean;
  migratingLocal: boolean;
  onMigrateLocalToCloud: () => void | Promise<void>;
};

type PrimaryNavItem = {
  to: string;
  /** `NavLink` `end`: só activo em match exacto do path. */
  end?: boolean;
  Icon: LucideIcon;
  label: string;
};

const PRIMARY_NAV: PrimaryNavItem[] = [
  { to: "/", end: true, Icon: Home, label: "Início" },
  { to: "/transactions", Icon: List, label: "Transações" },
  { to: "/accounts", Icon: Landmark, label: "Contas" },
  { to: "/categories", Icon: Tag, label: "Categorias" },
];

function navBtnClass(isActive: boolean, layout: "inline" | "stacked" = "inline") {
  return cn(
    "btn btn-sm gap-2 rounded-full border-0 no-underline whitespace-nowrap",
    layout === "inline" ? "shrink-0" : "w-full justify-start",
    isActive
      ? "btn-primary text-primary-content"
      : "btn-ghost text-base-content/80 hover:bg-base-200 hover:text-base-content",
  );
}

function connectionStatusLabel(
  online: boolean,
  authReady: boolean,
  ready: boolean,
): string {
  if (!online) return "Offline";
  if (!authReady) return "Sessão…";
  if (ready) return "Online";
  return "Carregando…";
}

/**
 * Texto da legenda mostrada como tooltip do badge de status. Resume onde os
 * dados estão a ser persistidos (nuvem vs IndexedDB local) e qualquer pré-
 * requisito relevante.
 */
function storageModeHint(usingCloud: boolean): string {
  if (usingCloud) {
    return "Dados na nuvem (Supabase). Requer conexão para alterações.";
  }
  if (isSupabaseConfigured()) {
    return "Dados neste aparelho (IndexedDB). Entre na nuvem para sincronizar entre dispositivos.";
  }
  return "Dados neste aparelho (IndexedDB). Opcional: variáveis VITE_SUPABASE_* para sync.";
}

function userInitials(email: string | null | undefined): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? local[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

function InlineNav() {
  return (
    <nav
      className="flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2"
      aria-label="Navegação principal"
    >
      {PRIMARY_NAV.map(({ to, end, Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => navBtnClass(isActive, "inline")}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function StackedNav({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav
      className="flex flex-col gap-1"
      aria-label="Navegação principal (móvel)"
    >
      {PRIMARY_NAV.map(({ to, end, Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) => navBtnClass(isActive, "stacked")}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function DashboardNavbar({
  online,
  migratingLocal,
  onMigrateLocalToCloud,
}: DashboardNavbarProps) {
  const authStatus = useAuthStore((s) => s.auth.status);
  const authSession = useAuthStore((s) => s.auth.session);
  const signOut = useAuthStore((s) => s.signOut);
  const txReady = useTransactionsStore((s) => s.transactions.ready);
  const accReady = useAccountsStore((s) => s.accounts.ready);
  const catReady = useCategoriesStore((s) => s.categories.ready);
  const authReady = authStatus === "signedIn" || authStatus === "signedOut";
  const ready = authReady && txReady && accReady && catReady;

  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const showCloudActions = isSupabaseConfigured() && Boolean(authSession?.user);
  const userId = authSession?.user?.id;
  const userEmail = authSession?.user?.email ?? null;
  const migrated = userId ? wasLocalDataMigratedForUser(userId) : false;
  const statusLabel = connectionStatusLabel(online, authReady, ready);
  const usingCloud =
    isSupabaseConfigured() &&
    authStatus === "signedIn" &&
    Boolean(authSession?.user);
  const storageHint = storageModeHint(usingCloud);

  // Painel mobile: abre/fecha com o hamburger; fecha automaticamente quando
  // a rota muda (clique num link, navegação programática, back/forward).
  const { pathname } = useLocation();
  const [mobileNav, setMobileNav] = useState({
    open: false,
    pathname,
  });

  if (mobileNav.pathname !== pathname) {
    setMobileNav({ open: false, pathname });
  }

  const mobileNavOpen = mobileNav.open && mobileNav.pathname === pathname;

  function setMobileNavOpen(open: boolean | ((current: boolean) => boolean)) {
    setMobileNav((current) => ({
      pathname,
      open: typeof open === "function" ? open(current.open) : open,
    }));
  }

  function closeAccountMenu() {
    accountMenuRef.current?.removeAttribute("open");
  }

  return (
    <header className="w-full border-b border-base-300 bg-base-100">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:py-2.5 lg:min-h-16">
        {/* Marca + título */}
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-initial">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-content"
            aria-hidden
          >
            <Wallet className="size-5" strokeWidth={2} />
          </div>
          <span className="min-w-0 truncate font-semibold tracking-tight text-base-content md:overflow-visible md:whitespace-normal md:text-clip">
            My Money Control
          </span>
        </div>

        {/* Links inline (sm+) */}
        <div className="hidden min-w-0 flex-1 sm:block sm:px-2">
          <InlineNav />
        </div>

        {/* Estado de rede + conta (dropdown só com sessão Supabase) + hamburger (móvel) */}
        <div className="flex shrink-0 items-center gap-2 sm:justify-self-end">
          {/* Tooltip do DaisyUI: a dica do modo de armazenamento aparece ao
              passar o rato. `tooltip-bottom-end` evita overflow no canto direito
              (em ecrãs estreitos é preferível ao centrado). */}
          <div
            className="tooltip tooltip-bottom max-[640px]:tooltip-left"
            data-tip={storageHint}
          >
            <Badge
              variant="soft"
              color="neutral"
              size="md"
              className="inline-flex shrink-0 items-center gap-1.5 px-2 font-normal"
              icon={
                online ? (
                  <Wifi className="size-3.5" aria-hidden />
                ) : (
                  <WifiOff className="size-3.5" aria-hidden />
                )
              }
              label={statusLabel}
              aria-label={`${statusLabel}. ${storageHint}`}
            />
          </div>

          {showCloudActions ? (
            <details ref={accountMenuRef} className="dropdown dropdown-end">
              <summary className="btn btn-ghost cursor-pointer list-none gap-1 rounded-full px-1.5 hover:bg-base-200 [&::-webkit-details-marker]:hidden">
                <span className="sr-only">Menu da conta</span>
                <div className="avatar avatar-placeholder" aria-hidden>
                  <div className="size-9 rounded-full bg-neutral text-neutral-content ring ring-base-200 ring-offset-2 ring-offset-base-100">
                    <span className="text-xs font-semibold">
                      {userInitials(userEmail)}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className="size-4 text-base-content/60"
                  aria-hidden
                />
              </summary>
              <ul className="dropdown-content menu z-50 mt-2 w-64 rounded-box border border-base-200 bg-base-100 p-2 shadow-lg">
                <li className="menu-title px-2 text-xs font-normal text-base-content/60">
                  Conta
                </li>
                <li className="px-2 pb-2">
                  <span
                    className="block truncate text-sm text-base-content"
                    title={userEmail ?? undefined}
                  >
                    {userEmail}
                  </span>
                </li>
                <li>
                  <button
                    type="button"
                    className="gap-2"
                    disabled={migratingLocal || migrated || !ready}
                    onClick={() => {
                      closeAccountMenu();
                      void onMigrateLocalToCloud();
                    }}
                    title={
                      migrated
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
                    Enviar dados locais
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="gap-2 text-error"
                    onClick={() => {
                      closeAccountMenu();
                      void signOut();
                    }}
                  >
                    <LogOut className="size-4" aria-hidden />
                    Sair
                  </button>
                </li>
              </ul>
            </details>
          ) : (
            <div className="avatar avatar-placeholder" aria-hidden>
              <div className="size-9 rounded-full bg-base-200 text-base-content/40">
                <User className="size-4" />
              </div>
            </div>
          )}

          {/* Hamburger: abre/fecha o painel de navegação móvel. */}
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square sm:hidden"
            aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileNavOpen}
            aria-controls="dashboard-mobile-nav"
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            <span className="relative inline-flex size-5 items-center justify-center">
              <Menu
                className={cn(
                  "absolute size-5 motion-safe:transition-[opacity,transform] motion-safe:duration-200",
                  mobileNavOpen
                    ? "opacity-0 motion-safe:rotate-90"
                    : "opacity-100 motion-safe:rotate-0",
                )}
                aria-hidden
              />
              <X
                className={cn(
                  "absolute size-5 motion-safe:transition-[opacity,transform] motion-safe:duration-200",
                  mobileNavOpen
                    ? "opacity-100 motion-safe:rotate-0"
                    : "opacity-0 motion-safe:-rotate-90",
                )}
                aria-hidden
              />
            </span>
          </button>
        </div>
      </div>

      {/* Painel mobile: slide + fade simples via max-height + opacity. */}
      <div
        id="dashboard-mobile-nav"
        className={cn(
          "overflow-hidden border-base-300 sm:hidden",
          "motion-safe:transition-[max-height,opacity,border-top-width] motion-safe:duration-300 motion-safe:ease-out",
          mobileNavOpen
            ? "max-h-96 border-t opacity-100"
            : "max-h-0 border-t-0 opacity-0",
        )}
        aria-hidden={!mobileNavOpen}
      >
        <div className="mx-auto max-w-6xl px-4 py-3">
          <StackedNav onNavigate={() => setMobileNavOpen(false)} />
        </div>
      </div>
    </header>
  );
}

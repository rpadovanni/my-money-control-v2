/**
 * Barra superior do dashboard autenticado: marca, links principais (scroll
 * horizontal em ecrãs estreitos), estado de ligação e menu da conta (nuvem).
 *
 * Lê estados puros das stores (auth/contas/categorias/transações) directamente.
 * Os valores que vêm de hooks com efeitos colaterais (`useDashboardShell` para
 * `online`, `useDashboardFeedback` para a migração) chegam por prop a partir do
 * `LoggedInLayout`, para que esses hooks rodem **uma só vez** no shell.
 */
import { useRef } from "react";
import {
  ChevronDown,
  CloudUpload,
  Home,
  Landmark,
  List,
  Loader2,
  LogOut,
  Tag,
  User,
  Wallet,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
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

function navBtnClass(isActive: boolean) {
  return cn(
    "btn btn-sm shrink-0 gap-2 rounded-full border-0 no-underline whitespace-nowrap",
    isActive
      ? "btn-neutral text-neutral-content"
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

function userInitials(email: string | null | undefined): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? local[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

function MainNav() {
  return (
    <div className="min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none">
      <nav
        className="mx-auto flex w-max max-w-none flex-nowrap items-center gap-1.5 sm:gap-2"
        aria-label="Navegação principal"
      >
        {PRIMARY_NAV.map(({ to, end, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => navBtnClass(isActive)}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
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

  function closeAccountMenu() {
    accountMenuRef.current?.removeAttribute("open");
  }

  return (
    <header className="w-full border-b border-base-300 bg-base-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:py-2.5 lg:min-h-16">
        {/* Marca + título */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral text-neutral-content"
            aria-hidden
          >
            <Wallet className="size-5" strokeWidth={2} />
          </div>
          <span className="min-w-0 truncate font-semibold tracking-tight text-base-content md:overflow-visible md:whitespace-normal md:text-clip">
            My Money Control
          </span>
        </div>

        {/* Links (scroll horizontal em mobile) */}
        <div className="min-w-0 py-0.5 sm:px-2">
          <MainNav />
        </div>

        {/* Estado de rede + conta (dropdown só com sessão Supabase) */}
        <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-self-end">
          <Badge
            variant="soft"
            color="neutral"
            size="sm"
            className="inline-flex shrink-0 items-center gap-1.5 px-2 font-normal"
            icon={
              online ? (
                <Wifi className="size-3.5" aria-hidden />
              ) : (
                <WifiOff className="size-3.5" aria-hidden />
              )
            }
            label={statusLabel}
          />

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
        </div>
      </div>
    </header>
  );
}

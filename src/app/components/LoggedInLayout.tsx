/**
 * Shell da área autenticada: navbar fixa no topo, depois a coluna de conteúdo
 * com largura máxima — aviso offline, cabeçalho da página (título + dica do
 * modo de armazenamento como subtítulo) e `<main>` para o resto da rota.
 *
 * Os hooks com efeitos (`useDashboardShell`/`useDashboardFeedback`) rodam no
 * `DashboardPage` (uma única vez); aqui só passamos os valores resultantes
 * adiante para a navbar.
 */
import type { ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { useAuthStore } from "../../features/auth/store/auth.store";
import { isSupabaseConfigured } from "../../shared/lib/supabase/client";
import { DashboardNavbar } from "./DashboardNavbar";

export type LoggedInLayoutProps = {
  online: boolean;
  migratingLocal: boolean;
  onMigrateLocalToCloud: () => void | Promise<void>;
  pageTitle: ReactNode;
  pageSubtitle?: ReactNode;
  children: ReactNode;
};

function storageModeHint(usingCloud: boolean): string {
  if (usingCloud) {
    return "Dados na nuvem (Supabase). Requer conexão para alterações.";
  }
  if (isSupabaseConfigured()) {
    return "Dados neste aparelho (IndexedDB). Entre na nuvem para sincronizar entre dispositivos.";
  }
  return "Dados neste aparelho (IndexedDB). Opcional: variáveis VITE_SUPABASE_* para sync.";
}

export function LoggedInLayout({
  online,
  migratingLocal,
  onMigrateLocalToCloud,
  pageTitle,
  pageSubtitle,
  children,
}: LoggedInLayoutProps) {
  const authStatus = useAuthStore((s) => s.auth.status);
  const authSession = useAuthStore((s) => s.auth.session);
  const usingCloud =
    isSupabaseConfigured() &&
    authStatus === "signedIn" &&
    Boolean(authSession?.user);

  return (
    <>
      <DashboardNavbar
        online={online}
        migratingLocal={migratingLocal}
        onMigrateLocalToCloud={onMigrateLocalToCloud}
      />

      <div className="mx-auto max-w-6xl p-4 pb-12 pt-6">
        {!online ? (
          <div className="alert alert-warning mb-4" role="status">
            <WifiOff className="size-4" aria-hidden />
            <span>
              Você está offline. O app precisa de conexão para sincronizar com a
              nuvem.
            </span>
          </div>
        ) : null}

        <header>
          <h1 className="text-3xl font-bold tracking-tight text-base-content">
            {pageTitle}
          </h1>
          {pageSubtitle ? (
            <p className="mt-1 text-base text-base-content/60">{pageSubtitle}</p>
          ) : null}
          <p className="mt-1 text-sm text-base-content/60">
            {storageModeHint(usingCloud)}
          </p>
        </header>

        <main className="mt-4">{children}</main>
      </div>
    </>
  );
}

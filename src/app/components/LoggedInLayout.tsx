/**
 * Shell da área autenticada: navbar fixa no topo, depois a coluna de conteúdo
 * com largura máxima — aviso offline, cabeçalho da página (título + subtítulo
 * + acções) e `<main>` para o resto da rota.
 *
 * A dica do modo de armazenamento (local vs nuvem) é exposta como tooltip do
 * badge de status na navbar — não duplicamos aqui no cabeçalho.
 *
 * Os hooks com efeitos (`useDashboardShell`/`useDashboardFeedback`) rodam no
 * `DashboardPage` (uma única vez); aqui só passamos os valores resultantes
 * adiante para a navbar.
 */
import type { ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { DashboardNavbar } from "./DashboardNavbar";

export type LoggedInLayoutProps = {
  online: boolean;
  migratingLocal: boolean;
  onMigrateLocalToCloud: () => void | Promise<void>;
  pageTitle: ReactNode;
  pageSubtitle?: ReactNode;
  /**
   * Acções específicas da página renderizadas à direita do título
   * (ex.: «+ Nova transação», «+ Adicionar conta»). Em ecrãs estreitos
   * descem para baixo do título.
   */
  headerActions?: ReactNode;
  children: ReactNode;
};

export function LoggedInLayout({
  online,
  migratingLocal,
  onMigrateLocalToCloud,
  pageTitle,
  pageSubtitle,
  headerActions,
  children,
}: LoggedInLayoutProps) {
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

        <header className="flex flex-col gap-3 min-[640px]:flex-row min-[640px]:items-start min-[640px]:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-base-content">
              {pageTitle}
            </h1>
            {pageSubtitle ? (
              <p className="mt-1 text-base text-base-content/60">
                {pageSubtitle}
              </p>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex flex-wrap items-center gap-2 min-[640px]:shrink-0 min-[640px]:justify-end">
              {headerActions}
            </div>
          ) : null}
        </header>

        <main className="mt-4">{children}</main>
      </div>
    </>
  );
}

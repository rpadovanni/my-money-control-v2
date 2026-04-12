import { isSupabaseConfigured } from '../../../shared/lib/supabase/client'
import { ui } from '../../../shared/styles/dashboard-ui'

export function RequireConfigured({ children }: { children: React.ReactNode }) {
  const ok = isSupabaseConfigured()
  if (ok) return children
  return (
    <div className={ui.container}>
      <header className={ui.header}>
        <div>
          <h1>My Money Control</h1>
          <p className={ui.muted}>Configuração necessária para usar a versão em nuvem.</p>
        </div>
      </header>
      <section className={ui.card}>
        <h2 className={ui.cardTitle}>Configure o Supabase</h2>
        <p className={ui.muted}>
          Para usar rotas protegidas (login obrigatório), defina as variáveis no arquivo <code>.env</code>:
        </p>
        <pre className={ui.codeBlock}>{`VITE_SUPABASE_URL=...\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}</pre>
        <p className={ui.muted}>
          Depois reinicie o <code>pnpm dev</code>. O passo a passo está em <code>README.md</code> e{' '}
          <code>docs/supabase-cloud-mvp.md</code>.
        </p>
      </section>
    </div>
  )
}

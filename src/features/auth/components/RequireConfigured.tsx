import { isSupabaseConfigured } from '../../../shared/lib/supabase/client'

export function RequireConfigured({ children }: { children: React.ReactNode }) {
  const ok = isSupabaseConfigured()
  if (ok) return children
  return (
    <div className="mx-auto max-w-5xl p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">My Money Control</h1>
        <p className="text-base-content/70">Configuração necessária para usar a versão em nuvem.</p>
      </header>
      <section className="card border border-base-300 bg-base-100">
        <div className="card-body">
          <h2 className="card-title">Configure o Supabase</h2>
          <p className="text-base-content/70">
          Para usar rotas protegidas (login obrigatório), defina as variáveis no arquivo <code>.env</code>:
          </p>
          <pre className="mt-3 overflow-auto whitespace-pre rounded-lg border border-base-300 bg-base-200 p-3 text-sm">{`VITE_SUPABASE_URL=...\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}</pre>
          <p className="text-base-content/70">
          Depois reinicie o <code>pnpm dev</code>. O passo a passo está em <code>README.md</code> e{' '}
          <code>docs/supabase-cloud-mvp.md</code>.
          </p>
        </div>
      </section>
    </div>
  )
}

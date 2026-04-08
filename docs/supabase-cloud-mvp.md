# Plano: MVP nuvem com Supabase (online-first)

Este documento descreve **como implementar** conta de usuário, dados remotos e sync entre dispositivos usando **Supabase** (Auth + Postgres + API), mantendo o app **online-first** no MVP — **sem** fila offline, sync eventual nem Dexie como fonte da verdade após login.

**Estado da implementação:** a base do MVP nuvem está **implementada** neste repositório (auth, gateways, repos remotos, UI na `App`, SQL em `docs/database/supabase_schema.sql`). Falta apenas criar o projeto Supabase, aplicar o SQL e preencher `.env` local.

### Comportamento no app (referência de produto)

- **Sem** `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`: o app mostra uma tela de **configuração necessária** (MVP nuvem exige Supabase).
- **Com variáveis** e **sem login**: o usuário é redirecionado para **`/login`** (rotas protegidas).
- **Logado**: contas e transações vão e vêm do **Postgres** via Supabase; o Dexie **não** é atualizado automaticamente pelo CRUD na nuvem (online-first simples).
- **Migrar dados locais**: o botão envia contas e transações do Dexie para a conta logada (`upsert` por `id`). Uma flag em `localStorage` (`mmc_migrated_local_to_cloud_<userId>`) impede repetir o envio no mesmo aparelho/usuário (evita duplicar por engano).
- **Decisão (IDs):** UUIDs gerados no **cliente** preservados ao migrar; **sem** FK no Postgres entre `transactions` e `accounts` no MVP (validação na app + RLS).
- **Rotas**: `/login`, `/` (início), `/transactions`, `/accounts`.
- **Cadastro**: criação de usuário é feita no painel do Supabase (a UI expõe apenas “Entrar”).

---

## 1. Objetivos e não-objetivos

### Objetivos

- Mesmo usuário autenticado vê **as mesmas contas e transações** no PC e no telemóvel.
- **Fonte da verdade** após login: Postgres (via Supabase).
- **Row Level Security (RLS)** garante que cada usuário só acede às suas linhas.
- Reaproveitar tipos de domínio existentes: `src/shared/store/types/accounts.ts`, `transactions.ts`.
- Camada de dados **clara**: slices não importam o cliente Supabase diretamente (ver secção 6).

### Não-objetivos (MVP nuvem)

- Funcionar offline com fila de sincronização.
- Resolver conflitos complexos (ver secção 12 — futuro).
- Substituir PWA; o app pode continuar instalável, mas operações críticas assumem rede.

---

## 2. Pré-requisitos no Supabase

1. Criar projeto em [supabase.com](https://supabase.com).
2. Ativar **Auth** (email/senha e/ou magic link — escolher o mínimo para o MVP).
3. Anotar **Project URL** e a **Publishable key** (`sb_publishable_...`) (usados no frontend com RLS; nunca expor a **Secret key** `sb_secret_...` no browser).
4. Definir **redirect URLs** do Auth para `http://localhost:5173` (dev) e o domínio de produção.

---

## 3. Modelo de dados (Postgres)

Nomenclatura sugerida: **snake_case** nas colunas; mapear para **camelCase** do domínio na camada de dados.

### Tabela `accounts`

| Coluna | Tipo | Notas |
|--------|------|--------|
| `id` | `uuid` | PK; pode ser gerado no cliente (`crypto.randomUUID`) ou pelo DB — decidir uma política e manter. |
| `user_id` | `uuid` | FK lógica para `auth.users(id)`; **obrigatório** em cada linha. |
| `name` | `text` | |
| `type` | `text` | Valores alinhados a `AccountType`: `bank`, `wallet`, `credit_card`, `other`. |
| `is_default` | `boolean` | Constraint opcional: no máximo um `true` por `user_id` (trigger ou validação na app + reparação). |
| `is_archived` | `boolean` | |
| `created_at` | `timestamptz` | ISO string no domínio: `createdAt`. |
| `updated_at` | `timestamptz` | Idem `updatedAt`; útil para last-write-wins futuro. |

Índices: `(user_id)`, `(user_id, is_archived)` conforme queries.

### Tabela `transactions`

| Coluna | Tipo | Notas |
|--------|------|--------|
| `id` | `uuid` | PK. |
| `user_id` | `uuid` | |
| `type` | `text` | `income`, `expense`, `transfer`. |
| `kind` | `text` | `normal`, `opening_balance`. |
| `account_id` | `uuid` | Obrigatório; em transferências replica origem (como no domínio atual). |
| `from_account_id` | `uuid` | Nullable. |
| `to_account_id` | `uuid` | Nullable. |
| `amount_cents` | `bigint` | Sempre positivo no domínio atual; manter regra igual. |
| `date` | `date` | `YYYY-MM-DD`. |
| `category` | `text` | IDs fixos ou futuras categorias custom. |
| `description` | `text` | Nullable. |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

Índices: `(user_id, date DESC)`, `(user_id, account_id)`, conforme filtros do MVP (mês, conta, tipo).

### Integridade referencial (opcional no MVP)

- FKs de `account_id` / `from_account_id` / `to_account_id` para `accounts(id)` **e** garantir mesmo `user_id` (constraint composta ou validação na aplicação). Para enxugar o MVP, validação na app + RLS pode bastar; documentar a decisão aqui quando implementado.

---

## 4. Row Level Security (RLS)

- Ativar RLS em **`accounts`** e **`transactions`**.
- Políticas típicas (pseudocódigo):

  - **SELECT / INSERT / UPDATE / DELETE**: `user_id = auth.uid()` (ajustar nomes exatos da coluna `user_id` vs claims).

- Testar no SQL Editor com usuários diferentes: usuário A não vê dados de B.
- **Nunca** confiar só no frontend; RLS é a barreira principal.

---

## 5. Fluxo de autenticação na app

1. **Signup / login** via Supabase Auth (UI mínima: telas ou modal dedicado).
2. Subscrever **`onAuthStateChange`**: ao receber sessão, guardar no estado global (ver slice `auth` ou `user` — secção 7).
3. **Sem sessão**: não carregar lista remota de contas/transações; mostrar CTA para login (ou modo “somente local” desativado quando o MVP nuvem for obrigatório — decisão de produto).
4. **Logout**: limpar estado em memória; opcionalmente redirecionar.
5. Tokens: usar cliente oficial `@supabase/supabase-js`; refresh gerido pela libraria.

Variáveis de ambiente (Vite):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Documentar em `.env.example` (sem segredos reais).

---

## 6. Camada de dados (manutenibilidade)

**Regra:** ficheiros em `src/shared/store/slices/` **não** importam `@supabase/supabase-js`.

Padrão sugerido (ajustar nomes ao estilo do repo):

- `src/shared/lib/supabase/client.ts` — criação singleton do cliente (lê env).
- `src/shared/lib/data/` (ou `src/shared/lib/repositories/`) — funções puras ou módulos finos:
  - `fetchAccounts`, `upsertAccount`, `deleteAccount` (se aplicável),
  - `fetchTransactions`, `upsertTransaction`, etc.
- Estas funções recebem o `SupabaseClient` **injetado** ou importam o singleton **apenas** nesta pasta — não nos slices.

**Slices** chamam apenas essas funções (ou wrappers). Assim:

- Testes podem mockar a camada de dados.
- Troca futura BaaS → API própria limita-se a esta pasta.
- Dexie (migração ou legacy) também fica aqui ou em `src/shared/lib/db/`, nunca espalhado na UI.

### Online-first após login

- **Leitura:** `loadAccounts` / `loadTransactions` → Supabase → `set` no Zustand.
- **Escrita:** cada mutação → `insert`/`update`/`delete` remotos → em caso de sucesso, atualizar estado local (ou refetch simples no MVP).

Tratamento de erros: mensagem à UI; retries mínimos opcionais (não obrigatório no MVP).

---

## 7. Estado global: slice de auth (e mapa do store)

- Adicionar slice **`auth`** (ou `user`) com: `session`, `user`, `status` (`idle` | `loading` | `signedIn` | `signedOut`), ações `signIn`, `signOut`, `hydrateSession`.
- **Slices independentes:** o slice de auth não importa accounts/transactions; a **UI** ou um **efeito** em `App.tsx` pode reagir a “signedIn” e disparar `loadAccounts` / `loadTransactions` dos outros slices (ou os slices expõem `loadFromRemote` chamados pela UI após login).
- Evitar que `accounts.slice` importe `transactions.slice` e vice-versa.

Atualizar o mapa mental em `.cursorrules` / `AGENTS.md` quando o slice existir.

---

## 8. Migração opcional: Dexie → Supabase

Objetivo: usuário com dados apenas locais faz login uma vez e envia dados para a conta.

1. Ler todas as contas e transações do Dexie (reutilizar funções existentes de `src/shared/lib/db/`).
2. Mapear para o formato das tabelas (incluir `user_id` da sessão atual).
3. Ordem sugerida: **inserir contas primeiro**, depois transações (se houver FKs ou validação de IDs).
4. Estratégia de IDs:
   - **Manter UUIDs** gerados no cliente: menos riscos de duplicar referências nas transferências.
   - Ou gerar novos no servidor e manter mapa `oldId → newId` durante o lote (mais frágil).
5. Após sucesso: opcional informar o usuário; **não apagar** Dexie automaticamente sem confirmação explícita (ou feature “limpar dados locais”).
6. Documentar limitações (ex.: duplicar migração se clicar duas vezes — usar flag `local_data_migrated` em `localStorage` ou equivalente, com cuidado com privacidade).

---

## 9. UI mínima

- Formulário login / registo (ou magic link).
- Indicador “a carregar” durante fetch inicial pós-login.
- Erro de rede visível (toast ou texto).
- Opcional: página “Dados neste dispositivo” com botão **Enviar para a minha conta**.

---

## 10. Segurança e produção

- Apenas **anon key** no frontend; variáveis em CI para build de produção.
- Rever políticas RLS antes de deploy.
- HTTPS em produção (hospedagem do PWA).
- Revisar CORS / domínios autorizados no painel Supabase.

---

## 11. Checklist de conclusão (definição de “feito”)

- [x] Tabelas e RLS: SQL versionado em [`docs/database/supabase_schema.sql`](database/supabase_schema.sql) (aplicar no painel Supabase).
- [x] `.env.example` com `VITE_SUPABASE_*`.
- [x] Cliente em `src/shared/lib/supabase/client.ts`; dados em `src/shared/lib/data/`; **slices** sem import do SDK.
- [x] Auth (`auth.slice`) + CRUD via gateways após login.
- [x] Migração Dexie → nuvem (`migrate-local-to-cloud.ts`) + UI na `App`.
- [x] `README.md` / `AGENTS.md` / `.cursorrules` apontam para este doc.
- [ ] **Operacional:** projeto Supabase criado, SQL executado, Auth (e-mail/senha) habilitado, redirect URLs configurados, `.env` local preenchido e testado em dispositivos reais.

---

## 12. Pós-MVP (não implementar agora — referência)

- Offline: Dexie como cache + fila; sync eventual; `updated_at` para last-write-wins.
- Realtime: subscrições Supabase para multi-tab.
- Categorias custom persistidas em tabela própria.

---

## Documentos relacionados

- [`docs/credit-card-and-transfers.md`](credit-card-and-transfers.md) — regras de domínio que o remoto deve respeitar.
- [`docs/database/`](database/) — referência histórica / SQL genérico; alinhar ou suplementar com SQL específico Supabase quando existir.
- [`README.md`](../README.md) — visão do produto e roadmap.

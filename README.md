# My Money Control v2

MVP de **finanças pessoais**: o app roda como **PWA** e, no MVP nuvem, os dados ficam na **nuvem (Supabase/Postgres)** para sincronizar entre dispositivos.

**Próximo passo planejado (MVP nuvem):** **Supabase** (Auth + Postgres + RLS): **conta de usuário + dados na nuvem como fonte da verdade**, **online-first** — mesmo cadastro no computador e no celular, **sem** camada offline elaborada no primeiro corte. Plano detalhado, schema, checklist e convenções: **[`docs/supabase-cloud-mvp.md`](docs/supabase-cloud-mvp.md)**. Visão resumida: **Roadmap** abaixo.

## O que já funciona (MVP)

- **Contas**: criar, editar, arquivar/restaurar, conta padrão, tipos (banco, carteira, **cartão de crédito**, outro)
- **Saldo inicial** por conta (lançamento especial; não entra como receita no resumo)
- **Transações**: receita, despesa e **transferência** entre contas (um registro; não entra em receita/despesa agregada)
- **Cartão de crédito**: “A pagar” no **mês civil atual** e atalho **Pagar fatura** (gera transferência)
- **Categorias**: lista fixa inicial (inclui “Transferência”)
- **Filtros**: mês, conta, tipo e categoria
- **Resumo mensal**: receitas, despesas, resultado (sem saldo inicial nem transferências) e saldo no período
- **Datas**: `date-fns` + locale pt-BR onde a UI formata datas
- **Armazenamento (MVP nuvem)**: Supabase (Postgres) como fonte da verdade. Dexie fica para **migração** e futuras evoluções de offline.

Documentação da feature de cartão e transferências: [`docs/credit-card-and-transfers.md`](docs/credit-card-and-transfers.md).  
MVP nuvem (Supabase, online-first): [`docs/supabase-cloud-mvp.md`](docs/supabase-cloud-mvp.md).

## Stack

- **Frontend**: React + TypeScript + Vite
- **Estado global**: Zustand (store único, slices independentes)
- **Banco local**: Dexie (IndexedDB) — hoje; migração opcional para nuvem quando o MVP Supabase estiver implementado
- **Backend planejado (MVP nuvem)**: Supabase (Auth + Postgres); variáveis `VITE_SUPABASE_*` — ver [`docs/supabase-cloud-mvp.md`](docs/supabase-cloud-mvp.md)
- **Datas**: date-fns
- **PWA**: `vite-plugin-pwa`

## Como rodar

```bash
pnpm install
pnpm dev
```

### Supabase (obrigatório no MVP nuvem)

1. Crie um projeto em [supabase.com](https://supabase.com) e habilite Auth com e-mail + senha.
2. No **SQL Editor**, execute [`docs/database/supabase_schema.sql`](docs/database/supabase_schema.sql).
3. Em **Authentication → URL configuration**, adicione `http://localhost:5173` (e o URL de produção do PWA).
4. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (a key `sb_publishable_...`, segura para o frontend com RLS).

Com as variáveis definidas, a UI expõe as rotas protegidas e a tela de login:

- `/login`
- `/` (início)
- `/transactions`
- `/accounts`

Build de produção:

```bash
pnpm build
pnpm preview
```

## Onde está o código

- **Tela principal (UI)**: `src/App.tsx`
- **Store**: `src/shared/store/index.ts`
- **Slices**: `src/shared/store/slices/transactions.slice.ts`, `accounts.slice.ts`
- **Tipos**: `src/shared/store/types/transactions.ts`, `accounts.ts`
- **IndexedDB (Dexie)**: `src/shared/lib/db/`
- **Datas compartilhadas**: `src/shared/lib/dates.ts`
- **Regras de saldo / resumo**: `src/features/transactions/utils/transaction-net.ts`
- **PWA**: `vite.config.ts` e registro em `src/main.tsx`
- **Nuvem (a implementar):** `src/shared/lib/supabase/`, `src/shared/lib/data/` ou `repositories/` — ver `docs/supabase-cloud-mvp.md` (slices **não** importam o SDK)

## Banco futuro (backend)

O diretório `docs/database/` contém material **genérico / referência**. O MVP nuvem usa **Postgres no Supabase**: schema, RLS e checklist em **[`docs/supabase-cloud-mvp.md`](docs/supabase-cloud-mvp.md)** (pode-se versionar SQL Supabase em `docs/database/` ou nas migrações do projeto, conforme decisão no doc).

## Roadmap (enxuto)

- **Curto prazo (produto local, como hoje)**
  - categorias customizáveis
  - export/import (CSV/JSON)
  - fatura por dia de fechamento (opcional)
  - melhorias de UI/UX e validação
- **Próximo: MVP nuvem (sync entre dispositivos, online-first) — Supabase**
  - implementação guiada por **[`docs/supabase-cloud-mvp.md`](docs/supabase-cloud-mvp.md)**
  - Supabase Auth + tabelas `accounts` / `transactions` + RLS por `user_id`
  - CRUD via cliente na camada `src/shared/lib/` após login; **sem** fila Dexie no MVP
  - fluxo opcional: “enviar dados locais para esta conta” (migração Dexie → remoto)
- **Futuro: offline-first avançado (pós-MVP nuvem)**
  - IndexedDB / Dexie como **cache + fila de mudanças** quando offline
  - **sincronização eventual** e política simples de conflito (ex.: last-write-wins por registro)
  - reconexão, retries e indicadores de “pendente / sincronizado” na UI
  - (Alternativa de longo prazo) backend Node.js + Fastify + Postgres, se sair do BaaS

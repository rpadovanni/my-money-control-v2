# Agent guide (My Money Control v2)

Este arquivo existe para manter o projeto consistente quando você (ou um agente) estiverem implementando novas features.

## Objetivo do produto (curto)
- App de finanças pessoal; **hoje** os dados vivem no **navegador (Dexie/IndexedDB)** e o app é **PWA**
- **Direção do MVP nuvem:** **Supabase** (Auth + Postgres), **online-first** — mesma conta no desktop e no mobile; ver **[`docs/supabase-cloud-mvp.md`](docs/supabase-cloud-mvp.md)** (plano, schema, RLS, camada de dados, checklist)
- **Futuro (pós-MVP nuvem):** offline avançado — cache local, fila e **sync eventual** (ver README → Roadmap)

## Regras de arquitetura (obrigatórias)
- **Store global único** em `src/shared/store`
- **Slices independentes** (sem import entre slices)
- **Tipos centralizados** em `src/shared/store/types`
- **UI consome apenas `useStore`** (nada de contexts para estado global)
- Evitar over-engineering: estrutura pequena, arquivos diretos, sem “camadas” desnecessárias

## Onde mexer
- UI principal: `src/App.tsx` (por enquanto; inclui painel Nuvem / auth)
- Store: `src/shared/store/index.ts`
- Slices: `src/shared/store/slices/*.slice.ts` (`auth`, `accounts`, `transactions`; **sem** import entre slices)
- Tipos: `src/shared/store/types/`
- IndexedDB (local / migração): `src/shared/lib/db/`
- **Supabase (quando implementado):** cliente em `src/shared/lib/supabase/`; leitura/escrita remota em `src/shared/lib/data/` ou `repositories/` — **não** dentro de `slices/`

## Padrões práticos
- Valores monetários: sempre em **centavos** no domínio (`amountCents`)
- Datas: `YYYY-MM-DD` no domínio
- Filtros: `YYYY-MM` (mês) para queries
- **Commits**: mensagens (assunto e corpo) sempre em **inglês** (ex.: Conventional Commits)


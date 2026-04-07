# My Money Control v2

MVP simples para **registrar receitas e despesas**, com **persistência local (IndexedDB)** e **offline-first** (PWA).

## O que já funciona (MVP)
- **Transações**: criar/editar/excluir (receita/despesa)
- **Categorias**: lista fixa inicial
- **Filtros**: mês, tipo e categoria
- **Resumo mensal**: receitas, despesas e saldo
- **Offline-first**: dados locais via IndexedDB (Dexie) e app como PWA

## Stack
- **Frontend**: React + TypeScript + Vite
- **Estado global**: Zustand (store único)
- **Banco local**: Dexie (IndexedDB)
- **PWA**: `vite-plugin-pwa`

## Como rodar
```bash
pnpm install
pnpm dev
```

Build de produção:
```bash
pnpm build
pnpm preview
```

## Onde está o código
- **Tela principal (UI)**: `src/App.tsx`
- **Store único**: `src/shared/store/index.ts`
- **Slice de transações**: `src/shared/store/slices/transactions.slice.ts`
- **Tipos do domínio**: `src/shared/store/types/transactions.ts`
- **IndexedDB (Dexie)**: `src/shared/lib/db/`
- **PWA config**: `vite.config.ts` e registro em `src/main.tsx`

## Banco futuro (backend)
O diretório `docs/database/` contém o material do banco **como referência** para quando entrarmos com backend/sincronização.

## Roadmap (enxuto)
- **Curto prazo**
  - categorias customizáveis
  - export/import (CSV/JSON)
  - melhorias de UI/UX e validação
- **Médio prazo (sync opcional)**
  - backend Node.js + Fastify + Postgres
  - autenticação e sincronização “eventual” (local-first → sync)

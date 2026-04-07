# My Money Control v2

MVP simples para **finanças pessoais offline-first**: transações locais **(IndexedDB)**, app como **PWA**.

## O que já funciona (MVP)

- **Contas**: criar, editar, arquivar/restaurar, conta padrão, tipos (banco, carteira, **cartão de crédito**, outro)
- **Saldo inicial** por conta (lançamento especial; não entra como receita no resumo)
- **Transações**: receita, despesa e **transferência** entre contas (um registro; não entra em receita/despesa agregada)
- **Cartão de crédito**: “A pagar” no **mês civil atual** e atalho **Pagar fatura** (gera transferência)
- **Categorias**: lista fixa inicial (inclui “Transferência”)
- **Filtros**: mês, conta, tipo e categoria
- **Resumo mensal**: receitas, despesas, resultado (sem saldo inicial nem transferências) e saldo no período
- **Datas**: `date-fns` + locale pt-BR onde a UI formata datas
- **Offline-first**: Dexie + PWA

Documentação da feature de cartão e transferências: [`docs/credit-card-and-transfers.md`](docs/credit-card-and-transfers.md).

## Stack

- **Frontend**: React + TypeScript + Vite
- **Estado global**: Zustand (store único, slices independentes)
- **Banco local**: Dexie (IndexedDB)
- **Datas**: date-fns
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
- **Store**: `src/shared/store/index.ts`
- **Slices**: `src/shared/store/slices/transactions.slice.ts`, `accounts.slice.ts`
- **Tipos**: `src/shared/store/types/transactions.ts`, `accounts.ts`
- **IndexedDB (Dexie)**: `src/shared/lib/db/`
- **Datas compartilhadas**: `src/shared/lib/dates.ts`
- **Regras de saldo / resumo**: `src/shared/lib/transaction-net.ts`
- **PWA**: `vite.config.ts` e registro em `src/main.tsx`

## Banco futuro (backend)

O diretório `docs/database/` contém o material do banco **como referência** para quando entrarmos com backend/sincronização.

## Roadmap (enxuto)

- **Curto prazo**
  - categorias customizáveis
  - export/import (CSV/JSON)
  - fatura por dia de fechamento (opcional)
  - melhorias de UI/UX e validação
- **Médio prazo (sync opcional)**
  - backend Node.js + Fastify + Postgres
  - autenticação e sincronização “eventual” (local-first → sync)

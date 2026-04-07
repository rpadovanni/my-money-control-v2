# Agent guide (My Money Control v2)

Este arquivo existe para manter o projeto consistente quando você (ou um agente) estiverem implementando novas features.

## Objetivo do produto (curto)
- App de finanças pessoal **offline-first**
- MVP atual: **transações** (receita/despesa) + filtros + resumo mensal
- Sync/back-end é **futuro e opcional** (local-first → sync eventual)

## Regras de arquitetura (obrigatórias)
- **Store global único** em `src/shared/store`
- **Slices independentes** (sem import entre slices)
- **Tipos centralizados** em `src/shared/store/types`
- **UI consome apenas `useStore`** (nada de contexts para estado global)
- Evitar over-engineering: estrutura pequena, arquivos diretos, sem “camadas” desnecessárias

## Onde mexer
- UI principal: `src/App.tsx` (por enquanto)
- Store: `src/shared/store/index.ts`
- Slice: `src/shared/store/slices/transactions.slice.ts`
- IndexedDB: `src/shared/lib/db/`

## Padrões práticos
- Valores monetários: sempre em **centavos** no domínio (`amountCents`)
- Datas: `YYYY-MM-DD` no domínio
- Filtros: `YYYY-MM` (mês) para queries


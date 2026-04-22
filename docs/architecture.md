# Architecture notes

Complements [AGENTS.md](../AGENTS.md) and [.cursorrules](../.cursorrules) with decisions that are easy to miss in code review.

## `src/domain/` (contratos partilhados)

Tipos e funções puras usadas por **repos/gateways em `shared/lib`** e pela **UI em `features/`** vivem em `src/domain/<aggregate>/` (ex.: `domain/transactions/types.ts`, `transaction-net.ts`). As features reexportam em `features/*/types` quando convém manter o import “pela feature”; `shared` importa sempre de `domain`, nunca de `features/`, para respeitar o isolamento documentado em AGENTS.

### Dependências (mental model)

```text
features/*  ──► domain/*     ◄──  shared/lib/*
app/*       ──► features/*       (gateways, db, mappers)
app/*       ──► domain/*         (só se precisar de tipos puros no shell — raro)
```

- **`domain/`** não importa `features/` nem `shared/` (só TS/stdlib).
- **`shared/lib`** não importa `features/`.

### Quando acrescentar ficheiros em `domain/`

- O mesmo tipo ou a mesma função pura é necessária **tanto** num repo/gateway **como** na store/UI, e duplicar geraria divergência (ex.: efeito de uma transação no mapa de saldos).
- Ainda não vale a pena um refactor que **mova repos para dentro da feature** (outro desenho válido descrito no AGENTS).

### Alternativa futura (maior)

Repos e gateways por agregado em `features/<agregado>/services/` reduzem o que `shared/lib` conhece do domínio; mesmo assim, **se** Dexie e Supabase e a UI continuarem a partilhar contrato, esse contrato continua a precisar de um módulo neutro — hoje `domain/`.

## Dashboard composition and props

`DashboardPage` is intentionally a **composition layer**: layout, route-driven `view` flags, and wiring hooks to feature components. Each route renders only what makes sense for it:

- `/` (Início) — KPIs (placeholder) + lista “Transações Recentes” somente leitura, com link «Ver todas».
- `/transactions` — `TransactionFiltersAndSummary` + `TransactionFormCard` + `TransactionsListSection` (lista com editar/excluir, diálogo de confirmação).
- `/accounts` — `AccountsCard` (CRUD de contas, transferências, “Pagar fatura”).
- `/categories` — `CategoriesSection`.

Feature UI vive em `src/features/*`. Componentes específicos das transações (lista, linha, ícone, hooks de view-model) ficam em `features/transactions/`; só componentes genuinamente genéricos (`Badge`, `SummaryMetricCard`, `ConfirmDialog`) ficam em `shared/components/ui/`.

### Prop drilling: current stance

Today, data flows **shallowly**: a `DashboardNavbar` lê estados puros de stores (auth, contas, categorias, transações) directamente; o `LoggedInLayout` recebe apenas `online`, `migratingLocal`, `onMigrateLocalToCloud` e o cabeçalho da página, e passa para a navbar. Os hooks com efeitos (`useDashboardShell`, `useDashboardFeedback`, `useDashboardBootstrap`, `useTransactionWorkspaceState`) rodam **uma única vez** no `DashboardPage`.

**We are not introducing Context or extra global state for this** until there is real pain: e.g. the same bundle of five or more props threaded through several layers of presentational components that do not use them, or two unrelated features needing the same “workspace” bundle without a clear owner.

### When to reconsider

- **Intermediate “dumb” components** start accepting many props only to forward them.
- **Duplicated prop bundles** appear in multiple sibling branches with copy-paste.
- **Cross-feature** UI needs the same orchestration state (still avoid feature→feature imports; prefer `shared` only for generic pieces, or a documented app-level hook/store if it truly is shell concern).

Until then, prefer **minimal props** and **hooks colocated with the shell** (`src/app/hooks`) over new abstraction layers.

## Startup wiring (`wire-finance-stores`)

Cross-feature **coordination** (e.g. subscribing one store to another) runs once at SPA startup. See the file-level documentation in `src/app/wire-finance-stores.ts` for why it exists, when it runs, and what logic belongs there (delegation only; no domain rules).

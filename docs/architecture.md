# Architecture notes

Complements [AGENTS.md](../AGENTS.md) and [.cursorrules](../.cursorrules) with decisions that are easy to miss in code review.

## Dashboard composition and props

`DashboardPage` is intentionally a **composition layer**: layout, route-driven `view` flags, and wiring hooks to feature components. Feature UI lives under `src/features/*`; the app shell lives under `src/app/`.

### Prop drilling: current stance

Today, data flows **shallowly**: the page passes props directly into `DashboardChrome` and into feature cards/sections. Most values are primitives, small DTOs, or stable callbacks from hooks (`useDashboardShell`, `useDashboardBootstrap`, `useDashboardFeedback`, `useTransactionWorkspaceState`).

**We are not introducing Context or extra global state for this** until there is real pain: e.g. the same bundle of five or more props threaded through several layers of presentational components that do not use them, or two unrelated features needing the same “workspace” bundle without a clear owner.

### When to reconsider

- **Intermediate “dumb” components** start accepting many props only to forward them.
- **Duplicated prop bundles** appear in multiple sibling branches with copy-paste.
- **Cross-feature** UI needs the same orchestration state (still avoid feature→feature imports; prefer `shared` only for generic pieces, or a documented app-level hook/store if it truly is shell concern).

Until then, prefer **minimal props** and **hooks colocated with the shell** (`src/app/hooks`) over new abstraction layers.

## Startup wiring (`wire-finance-stores`)

Cross-feature **coordination** (e.g. subscribing one store to another) runs once at SPA startup. See the file-level documentation in `src/app/wire-finance-stores.ts` for why it exists, when it runs, and what logic belongs there (delegation only; no domain rules).

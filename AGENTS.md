# AGENTS.md

## 🧠 Project Philosophy

Este projeto segue uma arquitetura **monolítica modular orientada a features**.

Objetivos:

- Escalabilidade sem complexidade desnecessária
- Baixo acoplamento entre features
- Alta previsibilidade
- Evolução baseada em uso real (não abstração prematura)

---

## 🎯 Objetivo do produto

- App de finanças pessoal
- Estado atual: **local-first (Dexie / IndexedDB) + PWA**
- MVP nuvem: **Supabase (Auth + Postgres)** com abordagem **online-first**
- Futuro: suporte a **offline avançado com sync eventual**

---

## 📁 Estrutura do projeto

```
src/
  app/
    router/
    providers/

  domain/
    <aggregate>/
      types.ts        # contratos estáveis (DTOs do modelo)
      *.ts            # funções puras partilhadas (ex.: efeito no saldo) — sem I/O

  features/
    <feature-name>/
      components/
      hooks/
      store/
      services/
      utils/
      types/
      pages/

  shared/
    components/
    hooks/
    utils/
    lib/
    types/

  assets/
  styles/
  main.tsx
```

---

## 🧩 Regras de arquitetura

### 1. Organização por feature

Cada feature deve ser **autocontida** e conter:

- UI (components)
- lógica (hooks)
- estado (store)
- dados (services)
- tipos (types)

---

### 2. Isolamento entre features

- ❌ Features NÃO podem importar outras features diretamente
- ✅ Comunicação / partilha via:
  - `shared/` (genérico, sem regra de negócio de finanças)
  - `domain/` (contratos e funções puras do modelo — ver secção seguinte)
  - serviços bem definidos (por feature ou em `shared/lib` conforme o caso)
  - orquestração em `app/` (ex.: `wire-finance-stores.ts`)

Importar **`features/` a partir de `shared/lib/`** é proibido: o contrato comum deve estar em **`domain/`** (ou a persistência teria de migrar para dentro da feature — ver secção 3).

---

### 3. Camada `domain/` (`src/domain/`)

**Objetivo:** um sítio **neutro** para tipos e lógica **pura** do modelo que precisam de ser **iguais** na persistência (`shared/lib/db`, gateways, mappers) e na UI (`features/*/store`, componentes).

| Pode entrar | Não entra |
|-------------|-----------|
| Tipos (`Transaction`, `Account`, …) | React, JSX, hooks |
| Funções puras (ex.: agregação de saldo, deltas de resumo) | Zustand, `useStore` |
| Constantes / unions alinhadas ao schema mental | Supabase client, `fetch`, Dexie `Table` |

- **`features/`** pode importar `domain/` diretamente ou **reexportar** em `features/<nome>/types/*` para manter imports “pela feature”.
- **`shared/lib/`** importa **`domain/`**, nunca `features/`, para não inverter o isolamento.

**Alternativa (refactor maior, só se fizer sentido):** colocar repos + gateways de um agregado dentro de `features/<agregado>/services/` (ou `lib/` da feature). Aí o contrato pode viver só na feature **se** nada fora dela precisar dele — o que deixa de ser verdade quando Dexie e Supabase partilham o mesmo tipo com a UI sem duplicar.

---

### 4. Uso do `shared/`

Só mover para `shared` quando:

- For usado por **2+ features**
- For **genérico (sem domínio específico)**

Tipos e funções puras **do modelo de finanças** partilhados por persistência e UI **não** vão para `shared/` — vão para **`domain/`** (secção 3).

---

### 5. Estado (Zustand)

- Preferir **estado por feature**
- Usar estado global apenas quando necessário:
  - auth
  - configurações globais

- ❌ Evitar store global gigante

---

### 6. Services (camada de dados)

Responsáveis por:

- API (Supabase)
- storage local (Dexie)
- regras de dados

Devem ser **independentes de React**

Separação recomendada:

```
services/
  feature.service.ts
  feature.api.ts
  feature.local.ts
```

---

### 7. Hooks

- Encapsulam lógica
- Não misturam UI
- Nome sempre com `use`

---

### 8. Componentes

- Sem `default export`
- Nome explícito
- Não fazem fetch direto

---

### 9. Fluxo de dados

UI → hooks → store → services / gateways (`shared/lib`) → (api/local). Contratos e regra pura partilhada: **`domain/`** (importada por store e por repos, sem I/O).

---

### 10. Padrões de domínio

- Valores monetários: `amountCents`
- Datas: `YYYY-MM-DD`
- Filtros: `YYYY-MM`

---

### 11. DRY vs YAGNI

- Duplicar antes de abstrair
- Evitar abstrações prematuras

---

## 🚨 Anti-patterns proibidos

- Store global centralizada gigante
- Features acopladas entre si (`features/a` importar `features/b`)
- `shared/lib` importar `features/` (usar `domain/` ou mover persistência para a feature)
- Services com dependência de React
- **Regra de negócio de finanças** dentro de `shared/` (tipos/regra partilhada → `domain/`)
- Abstrações genéricas sem uso real

---

## 🚀 Evolução do projeto

1. Criar feature isolada
2. Validar uso real
3. Refatorar
4. Contratos partilhados entre persistência (`shared/lib`) e UI → **`domain/`**; utilitários genéricos 2+ features → **`shared/`**

---

## 🎯 Objetivo final

Manter o projeto:

- modular
- previsível
- fácil de evoluir

Sem overengineering.

---

## Leitura adicional

- [`docs/architecture.md`](docs/architecture.md) — `domain/`, composição do dashboard, prop drilling, `wire-finance-stores`, e decisões que complementam este ficheiro.

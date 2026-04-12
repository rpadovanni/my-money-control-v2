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
- ✅ Comunicação via:
  - shared (genérico)
  - serviços bem definidos

---

### 3. Uso do `shared/`

Só mover para `shared` quando:

- For usado por **2+ features**
- For **genérico (sem domínio específico)**

---

### 4. Estado (Zustand)

- Preferir **estado por feature**
- Usar estado global apenas quando necessário:
  - auth
  - configurações globais

- ❌ Evitar store global gigante

---

### 5. Services (camada de dados)

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

### 6. Hooks

- Encapsulam lógica
- Não misturam UI
- Nome sempre com `use`

---

### 7. Componentes

- Sem `default export`
- Nome explícito
- Não fazem fetch direto

---

### 8. Fluxo de dados

UI → hooks → services → (api/local)

---

### 9. Padrões de domínio

- Valores monetários: `amountCents`
- Datas: `YYYY-MM-DD`
- Filtros: `YYYY-MM`

---

### 10. DRY vs YAGNI

- Duplicar antes de abstrair
- Evitar abstrações prematuras

---

## 🚨 Anti-patterns proibidos

- Store global centralizada gigante
- Features acopladas entre si
- Services com dependência de React
- Código de domínio dentro de shared
- Abstrações genéricas sem uso real

---

## 🚀 Evolução do projeto

1. Criar feature isolada
2. Validar uso real
3. Refatorar
4. Só então extrair para shared

---

## 🎯 Objetivo final

Manter o projeto:

- modular
- previsível
- fácil de evoluir

Sem overengineering.

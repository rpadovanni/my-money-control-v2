# My Money Control - Database Schema

Este diretório contém a modelagem e scripts SQL para o banco de dados relacional do sistema My Money Control.

## Estrutura de Arquivos

- `schema.sql` - Schema completo do banco de dados com todas as tabelas, índices, constraints e triggers
- `drop.sql` - Script para remover todas as tabelas e tipos (útil para desenvolvimento)
- `seed.sql` - Exemplos de dados iniciais (opcional)

## Banco de Dados

O schema foi projetado para PostgreSQL e utiliza:

- **UUID** como chaves primárias (usando extensão `uuid-ossp`)
- **ENUMs** para tipos fixos de dados
- **Triggers** automáticos para atualizar `updated_at`
- **Índices** otimizados para consultas frequentes
- **Constraints** para garantir integridade dos dados

## Tabelas Principais

### 1. users

Tabela de usuários do sistema.

### 2. transactions

Transações unificadas (receitas e despesas).

### 3. credit_cards

Cartões de crédito cadastrados.

### 4. purchases

Compras realizadas no cartão de crédito.

### 5. invoices

Faturas dos cartões de crédito.

### 6. invoice_purchases

Relacionamento entre faturas e compras (para compras parceladas).

### 7. monthly_budgets

Orçamento mensal por cartão.

### 8. budgets

Orçamentos por categoria de despesa.

### 9. fixed_costs

Custos fixos e assinaturas.

### 10. savings_goals

Metas de economia.

### 11. goal_contributions

Contribuições para metas de economia.

### 12. assets

Ativos de investimento.

### 13. investment_transactions

Transações de compra/venda de ativos.

### 14. price_history

Histórico de preços dos ativos.

### 15. monthly_checklists

Checklist mensal.

### 16. weekly_checklists

Checklist semanal.

### 17. checklist_items

Itens de checklist (mensal ou semanal).

### 18. settings

Configurações do usuário.

### 19. custom_categories

Categorias customizadas do usuário.

## Como Usar

### Criar o banco de dados

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar o banco de dados
CREATE DATABASE my_money_control;

# Conectar ao banco criado
\c my_money_control

# Executar o schema
\i database/schema.sql
```

### Remover todas as tabelas (desenvolvimento)

```bash
psql -U postgres -d my_money_control -f database/drop.sql
```

## Relacionamentos Principais

- **Users** → Todas as outras tabelas (1:N)
- **Credit Cards** → Purchases, Invoices, Monthly Budgets (1:N)
- **Purchases** → Invoice Purchases (1:N para compras parceladas)
- **Savings Goals** → Goal Contributions (1:N)
- **Assets** → Investment Transactions, Price History (1:N)
- **Checklists** → Checklist Items (1:N)

## Observações

- Todas as tabelas incluem `created_at` e `updated_at` com triggers automáticos
- Valores monetários usam `DECIMAL(10,2)` para precisão
- Datas são armazenadas como `DATE` ou `TIMESTAMP` conforme necessário
- Índices compostos otimizam consultas por período (ano/mês)
- Constraints UNIQUE garantem integridade dos dados

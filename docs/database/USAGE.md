# Como Usar o Banco de Dados

## Pré-requisitos

- PostgreSQL 12 ou superior instalado
- Acesso ao servidor PostgreSQL (local ou remoto)
- Permissões para criar banco de dados e tabelas

## Configuração Inicial

### 1. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=my_money_control
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui
```

### 2. Criar o Banco de Dados

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar o banco de dados
CREATE DATABASE my_money_control;

# Sair do psql
\q
```

### 3. Executar o Schema

```bash
# Conectar ao banco criado e executar o schema
psql -U postgres -d my_money_control -f database/schema.sql

# Criar as views (opcional, mas recomendado)
psql -U postgres -d my_money_control -f database/views.sql
```

### 4. (Opcional) Carregar Dados de Exemplo

```bash
psql -U postgres -d my_money_control -f database/seed.sql
```

## Usando o Script de Setup

O script `setup.sh` facilita as operações comuns:

```bash
# Tornar o script executável (apenas uma vez)
chmod +x database/setup.sh

# Executar o script
cd database
./setup.sh
```

O script oferece as seguintes opções:
1. Criar banco de dados e schema
2. Remover todas as tabelas
3. Resetar banco de dados (remover + criar)
4. Carregar dados de exemplo
5. Criar views

## Estrutura dos Arquivos

- **schema.sql**: Schema completo com todas as tabelas, tipos, índices e triggers
- **views.sql**: Views úteis para consultas comuns
- **drop.sql**: Script para remover todas as tabelas (uso em desenvolvimento)
- **seed.sql**: Dados de exemplo para testes
- **setup.sh**: Script helper para operações comuns

## Exemplos de Consultas

### Consultar transações do mês atual

```sql
SELECT * FROM transactions
WHERE user_id = 'seu-user-id'
  AND DATE_PART('year', date) = DATE_PART('year', CURRENT_DATE)
  AND DATE_PART('month', date) = DATE_PART('month', CURRENT_DATE)
ORDER BY date DESC;
```

### Verificar status dos orçamentos

```sql
SELECT * FROM budget_status
WHERE user_id = 'seu-user-id'
  AND year = 2024
  AND month = 1;
```

### Consultar resumo mensal

```sql
SELECT * FROM monthly_transaction_summary
WHERE user_id = 'seu-user-id'
  AND year = 2024
  AND month = 1;
```

### Ver progresso das metas de economia

```sql
SELECT * FROM savings_goal_progress
WHERE user_id = 'seu-user-id'
  AND is_completed = false;
```

## Migrações Futuras

Para adicionar novas tabelas ou modificar o schema existente:

1. Crie um novo arquivo de migração: `migrations/YYYYMMDD_description.sql`
2. Documente as mudanças
3. Teste a migração em ambiente de desenvolvimento
4. Execute em produção com backup prévio

## Backup e Restore

### Backup

```bash
pg_dump -U postgres -d my_money_control > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
psql -U postgres -d my_money_control < backup_YYYYMMDD.sql
```

## Troubleshooting

### Erro: "relation does not exist"
- Certifique-se de que executou o `schema.sql` primeiro
- Verifique se está conectado ao banco de dados correto

### Erro: "permission denied"
- Verifique as permissões do usuário PostgreSQL
- Certifique-se de que o usuário tem permissão para criar tabelas

### Erro: "extension uuid-ossp does not exist"
- Execute: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- Isso já está incluído no `schema.sql`, mas pode ser necessário executar manualmente


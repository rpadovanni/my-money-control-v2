-- My Money Control v2 — RESET TOTAL (DROP + RECREATE)
--
-- Objetivo: deixar o Supabase 100% limpo (sem dados e sem tabelas),
-- e recriar o schema do MVP do zero.
--
-- Como usar:
-- - Abra o SQL Editor do projeto Supabase
-- - Cole este arquivo e execute
--
-- Aviso: isto apaga tudo em `public.accounts`, `public.transactions`, `public.categories`.
-- (RLS policies e índices associados também são removidos via CASCADE.)

begin;

drop table if exists public.transactions cascade;
drop table if exists public.accounts cascade;
drop table if exists public.categories cascade;

commit;

-- Recria o schema (copiado de `docs/database/supabase_schema.sql`).

create table if not exists public.accounts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  kind text not null,
  account_id uuid not null,
  from_account_id uuid,
  to_account_id uuid,
  amount_cents bigint not null,
  date date not null,
  category text not null,
  description text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);
create index if not exists accounts_user_archived_idx on public.accounts (user_id, is_archived);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_user_account_idx on public.transactions (user_id, account_id);

alter table public.accounts enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_insert_own" on public.accounts;
drop policy if exists "accounts_update_own" on public.accounts;
drop policy if exists "accounts_delete_own" on public.accounts;

create policy "accounts_select_own" on public.accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts for update using (auth.uid() = user_id);
create policy "accounts_delete_own" on public.accounts for delete using (auth.uid() = user_id);

drop policy if exists "tx_select_own" on public.transactions;
drop policy if exists "tx_insert_own" on public.transactions;
drop policy if exists "tx_update_own" on public.transactions;
drop policy if exists "tx_delete_own" on public.transactions;

create policy "tx_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "tx_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "tx_update_own" on public.transactions for update using (auth.uid() = user_id);
create policy "tx_delete_own" on public.transactions for delete using (auth.uid() = user_id);

-- Categorias personalizáveis por usuário (id estável; rótulo editável)
create table if not exists public.categories (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  label text not null,
  type text not null default 'expense',
  system boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

alter table public.categories add column if not exists type text not null default 'expense';

update public.categories
set type = 'income'
where id in ('salary', 'freelance') and type = 'expense';

update public.categories
set type = 'transfer'
where id = 'transfer' and type <> 'transfer';

create index if not exists categories_user_label_idx on public.categories (user_id, label);
create index if not exists categories_user_type_idx on public.categories (user_id, type);

alter table public.categories enable row level security;

drop policy if exists "categories_select_own" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
drop policy if exists "categories_update_own" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;

create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);


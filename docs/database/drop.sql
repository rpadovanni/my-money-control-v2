-- My Money Control - Drop All Tables
-- WARNING: This will delete all tables and data!
-- Use only in development environment

-- Drop triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_credit_cards_updated_at ON credit_cards;
DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS update_monthly_budgets_updated_at ON monthly_budgets;
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
DROP TRIGGER IF EXISTS update_fixed_costs_updated_at ON fixed_costs;
DROP TRIGGER IF EXISTS update_savings_goals_updated_at ON savings_goals;
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
DROP TRIGGER IF EXISTS update_investment_transactions_updated_at ON investment_transactions;
DROP TRIGGER IF EXISTS update_monthly_checklists_updated_at ON monthly_checklists;
DROP TRIGGER IF EXISTS update_weekly_checklists_updated_at ON weekly_checklists;
DROP TRIGGER IF EXISTS update_checklist_items_updated_at ON checklist_items;
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
DROP TRIGGER IF EXISTS update_custom_categories_updated_at ON custom_categories;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS custom_categories CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS weekly_checklists CASCADE;
DROP TABLE IF EXISTS monthly_checklists CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS investment_transactions CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS goal_contributions CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;
DROP TABLE IF EXISTS fixed_costs CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS monthly_budgets CASCADE;
DROP TABLE IF EXISTS invoice_purchases CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS credit_cards CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop types
DROP TYPE IF EXISTS category_type_enum CASCADE;
DROP TYPE IF EXISTS number_format_enum CASCADE;
DROP TYPE IF EXISTS date_format_enum CASCADE;
DROP TYPE IF EXISTS currency_format_enum CASCADE;
DROP TYPE IF EXISTS theme_enum CASCADE;
DROP TYPE IF EXISTS investment_transaction_type_enum CASCADE;
DROP TYPE IF EXISTS asset_type_enum CASCADE;
DROP TYPE IF EXISTS contribution_source_enum CASCADE;
DROP TYPE IF EXISTS goal_type_enum CASCADE;
DROP TYPE IF EXISTS goal_status_enum CASCADE;
DROP TYPE IF EXISTS fixed_cost_type_enum CASCADE;
DROP TYPE IF EXISTS purchase_category_enum CASCADE;
DROP TYPE IF EXISTS payment_method_enum CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;


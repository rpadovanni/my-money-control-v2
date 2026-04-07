-- My Money Control - Database Schema
-- PostgreSQL Database Schema
-- Created based on the relational database modeling plan

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. TRANSACTIONS TABLE
-- ============================================================================
CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense');
CREATE TYPE payment_method_enum AS ENUM ('pix', 'debit', 'credit-card');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type transaction_type_enum NOT NULL,
    category VARCHAR(50) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    payment_method payment_method_enum,
    credit_card_id UUID,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category);

-- ============================================================================
-- 3. CREDIT CARDS TABLE
-- ============================================================================
CREATE TABLE credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    last_four_digits VARCHAR(4) NOT NULL,
    closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
    due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    limit DECIMAL(10,2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for credit_cards
CREATE INDEX idx_credit_cards_user ON credit_cards(user_id);
CREATE INDEX idx_credit_cards_active ON credit_cards(user_id, active);

-- Add foreign key constraint for transactions.credit_card_id
ALTER TABLE transactions
    ADD CONSTRAINT fk_transactions_credit_card
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. PURCHASES TABLE
-- ============================================================================
CREATE TYPE purchase_category_enum AS ENUM (
    'food', 'transport', 'entertainment', 'health', 'education',
    'shopping', 'bills', 'travel', 'other'
);

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    installments INTEGER DEFAULT 1 CHECK (installments > 0),
    current_installment INTEGER DEFAULT 1 CHECK (current_installment > 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for purchases
CREATE INDEX idx_purchases_card ON purchases(card_id);
CREATE INDEX idx_purchases_date ON purchases(card_id, date);

-- ============================================================================
-- 5. INVOICES TABLE
-- ============================================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    closing_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(card_id, year, month)
);

-- Indexes for invoices
CREATE INDEX idx_invoices_card ON invoices(card_id);
CREATE UNIQUE INDEX idx_invoices_period ON invoices(card_id, year, month);

-- ============================================================================
-- 6. INVOICE PURCHASES TABLE (Junction table for parceled purchases)
-- ============================================================================
CREATE TABLE invoice_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL
);

-- Indexes for invoice_purchases
CREATE INDEX idx_invoice_purchases_invoice ON invoice_purchases(invoice_id);
CREATE INDEX idx_invoice_purchases_purchase ON invoice_purchases(purchase_id);

-- ============================================================================
-- 7. MONTHLY BUDGETS TABLE (Credit card monthly budgets)
-- ============================================================================
CREATE TABLE monthly_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    limit DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(card_id, year, month)
);

-- Indexes for monthly_budgets
CREATE INDEX idx_monthly_budgets_card ON monthly_budgets(card_id);
CREATE UNIQUE INDEX idx_monthly_budgets_period ON monthly_budgets(card_id, year, month);

-- ============================================================================
-- 8. BUDGETS TABLE (Category budgets)
-- ============================================================================
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    limit DECIMAL(10,2) NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, year, month, category)
);

-- Indexes for budgets
CREATE INDEX idx_budgets_user ON budgets(user_id);
CREATE UNIQUE INDEX idx_budgets_period ON budgets(user_id, year, month, category);

-- ============================================================================
-- 9. FIXED COSTS TABLE
-- ============================================================================
CREATE TYPE fixed_cost_type_enum AS ENUM ('housing', 'health', 'subscriptions');

CREATE TABLE fixed_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type fixed_cost_type_enum NOT NULL,
    due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for fixed_costs
CREATE INDEX idx_fixed_costs_user ON fixed_costs(user_id);
CREATE INDEX idx_fixed_costs_active ON fixed_costs(user_id, active);

-- ============================================================================
-- 10. SAVINGS GOALS TABLE
-- ============================================================================
CREATE TYPE goal_status_enum AS ENUM ('active', 'completed', 'paused', 'cancelled');
CREATE TYPE goal_type_enum AS ENUM ('amount', 'percentage', 'custom');

CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    target_date DATE,
    start_date DATE NOT NULL,
    status goal_status_enum NOT NULL DEFAULT 'active',
    type goal_type_enum NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for savings_goals
CREATE INDEX idx_savings_goals_user ON savings_goals(user_id);
CREATE INDEX idx_savings_goals_status ON savings_goals(user_id, status);

-- ============================================================================
-- 11. GOAL CONTRIBUTIONS TABLE
-- ============================================================================
CREATE TYPE contribution_source_enum AS ENUM ('manual', 'expense_savings', 'budget_surplus');

CREATE TABLE goal_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    source contribution_source_enum NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for goal_contributions
CREATE INDEX idx_goal_contributions_goal ON goal_contributions(goal_id);
CREATE INDEX idx_goal_contributions_date ON goal_contributions(goal_id, date);

-- ============================================================================
-- 12. ASSETS TABLE
-- ============================================================================
CREATE TYPE asset_type_enum AS ENUM ('stock', 'bond', 'fund', 'crypto', 'other');

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    type asset_type_enum NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, code)
);

-- Indexes for assets
CREATE INDEX idx_assets_user ON assets(user_id);
CREATE UNIQUE INDEX idx_assets_code ON assets(user_id, code);

-- ============================================================================
-- 13. INVESTMENT TRANSACTIONS TABLE
-- ============================================================================
CREATE TYPE investment_transaction_type_enum AS ENUM ('buy', 'sell');

CREATE TABLE investment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    type investment_transaction_type_enum NOT NULL,
    quantity DECIMAL(10,4) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    fees DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for investment_transactions
CREATE INDEX idx_investment_transactions_asset ON investment_transactions(asset_id);
CREATE INDEX idx_investment_transactions_date ON investment_transactions(asset_id, date);

-- ============================================================================
-- 14. PRICE HISTORY TABLE
-- ============================================================================
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(asset_id, date)
);

-- Indexes for price_history
CREATE INDEX idx_price_history_asset ON price_history(asset_id);
CREATE UNIQUE INDEX idx_price_history_date ON price_history(asset_id, date);

-- ============================================================================
-- 15. MONTHLY CHECKLISTS TABLE
-- ============================================================================
CREATE TABLE monthly_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    last_reset_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- Indexes for monthly_checklists
CREATE INDEX idx_monthly_checklists_user ON monthly_checklists(user_id);
CREATE UNIQUE INDEX idx_monthly_checklists_month ON monthly_checklists(user_id, month);

-- ============================================================================
-- 16. WEEKLY CHECKLISTS TABLE
-- ============================================================================
CREATE TABLE weekly_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week VARCHAR(7) NOT NULL, -- Format: YYYY-WW
    last_reset_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, week)
);

-- Indexes for weekly_checklists
CREATE INDEX idx_weekly_checklists_user ON weekly_checklists(user_id);
CREATE UNIQUE INDEX idx_weekly_checklists_week ON weekly_checklists(user_id, week);

-- ============================================================================
-- 17. CHECKLIST ITEMS TABLE
-- ============================================================================
CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monthly_checklist_id UUID REFERENCES monthly_checklists(id) ON DELETE CASCADE,
    weekly_checklist_id UUID REFERENCES weekly_checklists(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    checked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (
        (monthly_checklist_id IS NOT NULL AND weekly_checklist_id IS NULL) OR
        (monthly_checklist_id IS NULL AND weekly_checklist_id IS NOT NULL)
    )
);

-- Indexes for checklist_items
CREATE INDEX idx_checklist_items_monthly ON checklist_items(monthly_checklist_id);
CREATE INDEX idx_checklist_items_weekly ON checklist_items(weekly_checklist_id);

-- ============================================================================
-- 18. SETTINGS TABLE
-- ============================================================================
CREATE TYPE theme_enum AS ENUM ('light', 'dark', 'system');
CREATE TYPE currency_format_enum AS ENUM ('BRL', 'USD', 'EUR');
CREATE TYPE date_format_enum AS ENUM ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD');
CREATE TYPE number_format_enum AS ENUM ('pt-BR', 'en-US');

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme theme_enum NOT NULL DEFAULT 'system',
    currency_format currency_format_enum NOT NULL DEFAULT 'BRL',
    date_format date_format_enum NOT NULL DEFAULT 'DD/MM/YYYY',
    number_format number_format_enum NOT NULL DEFAULT 'pt-BR',
    show_decimals BOOLEAN NOT NULL DEFAULT true,
    compact_mode BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for settings
CREATE UNIQUE INDEX idx_settings_user ON settings(user_id);

-- ============================================================================
-- 19. CUSTOM CATEGORIES TABLE
-- ============================================================================
CREATE TYPE category_type_enum AS ENUM ('expense', 'income');

CREATE TABLE custom_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    type category_type_enum NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Indexes for custom_categories
CREATE INDEX idx_custom_categories_user ON custom_categories(user_id);
CREATE UNIQUE INDEX idx_custom_categories_name ON custom_categories(user_id, name);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON credit_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_budgets_updated_at BEFORE UPDATE ON monthly_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixed_costs_updated_at BEFORE UPDATE ON fixed_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_transactions_updated_at BEFORE UPDATE ON investment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_checklists_updated_at BEFORE UPDATE ON monthly_checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_checklists_updated_at BEFORE UPDATE ON weekly_checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_categories_updated_at BEFORE UPDATE ON custom_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


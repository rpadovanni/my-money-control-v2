-- My Money Control - Seed Data
-- Example data for development and testing
-- WARNING: This will insert test data into the database

-- Insert a test user
INSERT INTO users (id, email, name) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test User');

-- Insert settings for the test user
INSERT INTO settings (user_id, theme, currency_format, date_format, number_format, show_decimals, compact_mode) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'system', 'BRL', 'DD/MM/YYYY', 'pt-BR', true, false);

-- Insert a credit card
INSERT INTO credit_cards (id, user_id, name, last_four_digits, closing_day, due_day, limit, active) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Cartão Nubank', '1234', 5, 10, 5000.00, true);

-- Insert some transactions
INSERT INTO transactions (user_id, date, type, category, value, payment_method, notes) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', '2024-01-15', 'expense', 'food', 45.50, 'pix', 'Almoço'),
    ('550e8400-e29b-41d4-a716-446655440000', '2024-01-16', 'expense', 'transport', 12.00, 'debit', 'Uber'),
    ('550e8400-e29b-41d4-a716-446655440000', '2024-01-01', 'income', 'salary', 5000.00, NULL, 'Salário mensal');

-- Insert a purchase
INSERT INTO purchases (id, card_id, description, amount, category, date, installments, current_installment) VALUES
    ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'Compra no supermercado', 250.00, 'food', '2024-01-10', 1, 1);

-- Insert a fixed cost
INSERT INTO fixed_costs (user_id, description, amount, type, due_day, active, notes) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Aluguel', 1200.00, 'housing', 5, true, 'Aluguel do apartamento');

-- Insert a savings goal
INSERT INTO savings_goals (id, user_id, name, description, target_amount, current_amount, start_date, status, type) VALUES
    ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Reserva de Emergência', 'Criar reserva de emergência de 6 meses', 30000.00, 5000.00, '2024-01-01', 'active', 'amount');

-- Insert a budget
INSERT INTO budgets (user_id, category, limit, month, year) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'food', 500.00, 1, 2024);

-- Insert an asset
INSERT INTO assets (id, user_id, name, code, type) VALUES
    ('990e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Petrobras', 'PETR4', 'stock');

-- Insert an investment transaction
INSERT INTO investment_transactions (asset_id, type, quantity, price, date, fees) VALUES
    ('990e8400-e29b-41d4-a716-446655440004', 'buy', 10.0000, 35.50, '2024-01-05', 5.00);


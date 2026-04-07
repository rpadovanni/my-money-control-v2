-- My Money Control - Useful Views
-- Views for common queries and aggregations

-- ============================================================================
-- VIEW: Monthly Transaction Summary
-- ============================================================================
CREATE OR REPLACE VIEW monthly_transaction_summary AS
SELECT
    u.id AS user_id,
    DATE_PART('year', t.date) AS year,
    DATE_PART('month', t.date) AS month,
    t.type,
    SUM(t.value) AS total,
    COUNT(*) AS count
FROM users u
INNER JOIN transactions t ON t.user_id = u.id
GROUP BY u.id, DATE_PART('year', t.date), DATE_PART('month', t.date), t.type;

-- ============================================================================
-- VIEW: Budget Status
-- ============================================================================
CREATE OR REPLACE VIEW budget_status AS
SELECT
    b.id,
    b.user_id,
    b.category,
    b.limit,
    b.month,
    b.year,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.value ELSE 0 END), 0) AS spent,
    b.limit - COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.value ELSE 0 END), 0) AS remaining,
    CASE
        WHEN b.limit > 0 THEN
            (COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.value ELSE 0 END), 0) / b.limit) * 100
        ELSE 0
    END AS percentage,
    CASE
        WHEN COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.value ELSE 0 END), 0) > b.limit THEN true
        ELSE false
    END AS is_exceeded,
    CASE
        WHEN (COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.value ELSE 0 END), 0) / b.limit) * 100 > 80 THEN true
        ELSE false
    END AS is_warning
FROM budgets b
LEFT JOIN transactions t ON
    t.user_id = b.user_id AND
    t.category = b.category AND
    DATE_PART('year', t.date) = b.year AND
    DATE_PART('month', t.date) = b.month AND
    t.type = 'expense'
GROUP BY b.id, b.user_id, b.category, b.limit, b.month, b.year;

-- ============================================================================
-- VIEW: Credit Card Invoice Summary
-- ============================================================================
CREATE OR REPLACE VIEW credit_card_invoice_summary AS
SELECT
    i.id AS invoice_id,
    i.card_id,
    cc.name AS card_name,
    cc.user_id,
    i.month,
    i.year,
    i.total AS invoice_total,
    i.paid,
    i.due_date,
    COALESCE(SUM(ip.amount), 0) AS purchases_total,
    i.total - COALESCE(SUM(ip.amount), 0) AS difference
FROM invoices i
INNER JOIN credit_cards cc ON cc.id = i.card_id
LEFT JOIN invoice_purchases ip ON ip.invoice_id = i.id
GROUP BY i.id, i.card_id, cc.name, cc.user_id, i.month, i.year, i.total, i.paid, i.due_date;

-- ============================================================================
-- VIEW: Savings Goal Progress
-- ============================================================================
CREATE OR REPLACE VIEW savings_goal_progress AS
SELECT
    sg.id AS goal_id,
    sg.user_id,
    sg.name AS goal_name,
    sg.target_amount,
    sg.current_amount,
    sg.target_amount - sg.current_amount AS remaining_amount,
    CASE
        WHEN sg.target_amount > 0 THEN
            (sg.current_amount / sg.target_amount) * 100
        ELSE 0
    END AS percentage,
    CASE
        WHEN sg.target_date IS NOT NULL THEN
            sg.target_date - CURRENT_DATE
        ELSE NULL
    END AS days_remaining,
    CASE
        WHEN sg.current_amount >= sg.target_amount THEN true
        ELSE false
    END AS is_completed,
    CASE
        WHEN sg.target_date IS NOT NULL AND sg.current_amount > 0 THEN
            sg.target_date - ((sg.target_amount - sg.current_amount) / (sg.current_amount / GREATEST(EXTRACT(DAY FROM CURRENT_DATE - sg.start_date), 1)))
        ELSE NULL
    END AS estimated_completion_date
FROM savings_goals sg;

-- ============================================================================
-- VIEW: Asset Position Summary
-- ============================================================================
CREATE OR REPLACE VIEW asset_position_summary AS
SELECT
    a.id AS asset_id,
    a.user_id,
    a.name AS asset_name,
    a.code,
    a.type AS asset_type,
    -- Buy transactions
    COALESCE(SUM(CASE WHEN it.type = 'buy' THEN it.quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN it.type = 'sell' THEN it.quantity ELSE 0 END), 0) AS total_quantity,
    -- Average buy price
    CASE
        WHEN COALESCE(SUM(CASE WHEN it.type = 'buy' THEN it.quantity ELSE 0 END), 0) > 0 THEN
            SUM(CASE WHEN it.type = 'buy' THEN it.quantity * it.price ELSE 0 END) /
            SUM(CASE WHEN it.type = 'buy' THEN it.quantity ELSE 0 END)
        ELSE 0
    END AS average_price,
    -- Total invested
    COALESCE(SUM(CASE WHEN it.type = 'buy' THEN it.quantity * it.price + COALESCE(it.fees, 0) ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN it.type = 'sell' THEN it.quantity * it.price - COALESCE(it.fees, 0) ELSE 0 END), 0) AS total_invested,
    -- Current price (latest from price_history)
    (
        SELECT price
        FROM price_history ph
        WHERE ph.asset_id = a.id
        ORDER BY ph.date DESC
        LIMIT 1
    ) AS current_price
FROM assets a
LEFT JOIN investment_transactions it ON it.asset_id = a.id
GROUP BY a.id, a.user_id, a.name, a.code, a.type;

-- ============================================================================
-- VIEW: Monthly Expenses by Category
-- ============================================================================
CREATE OR REPLACE VIEW monthly_expenses_by_category AS
SELECT
    u.id AS user_id,
    DATE_PART('year', t.date) AS year,
    DATE_PART('month', t.date) AS month,
    t.category,
    SUM(t.value) AS total,
    COUNT(*) AS count
FROM users u
INNER JOIN transactions t ON t.user_id = u.id
WHERE t.type = 'expense'
GROUP BY u.id, DATE_PART('year', t.date), DATE_PART('month', t.date), t.category;

-- ============================================================================
-- VIEW: Monthly Income Summary
-- ============================================================================
CREATE OR REPLACE VIEW monthly_income_summary AS
SELECT
    u.id AS user_id,
    DATE_PART('year', t.date) AS year,
    DATE_PART('month', t.date) AS month,
    SUM(t.value) AS total_income,
    COUNT(*) AS count
FROM users u
INNER JOIN transactions t ON t.user_id = u.id
WHERE t.type = 'income'
GROUP BY u.id, DATE_PART('year', t.date), DATE_PART('month', t.date);


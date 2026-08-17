-- V1__create_vendor_analytics_and_payouts.sql
-- Create persistent vendor analytics and payouts tables for ShopStack

CREATE TABLE IF NOT EXISTS vendor_sales_summary (
    summary_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    summary_date DATE NOT NULL,
    total_orders INT NOT NULL DEFAULT 0,
    total_units_sold INT NOT NULL DEFAULT 0,
    gross_revenue DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    commission_deducted DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_payout DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    refunds_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_vendor_summary_date UNIQUE (vendor_id, summary_date),
    CONSTRAINT fk_sales_summary_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_product_performance (
    performance_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    product_id UUID NOT NULL,
    summary_date DATE NOT NULL,
    units_sold INT NOT NULL DEFAULT 0,
    revenue DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    views INT NOT NULL DEFAULT 0,
    avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    return_count INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_vendor_product_summary_date UNIQUE (vendor_id, product_id, summary_date),
    CONSTRAINT fk_prod_perf_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE,
    CONSTRAINT fk_prod_perf_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_customer_insights (
    insight_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    summary_date DATE NOT NULL,
    new_customers INT NOT NULL DEFAULT 0,
    repeat_customers INT NOT NULL DEFAULT 0,
    avg_order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_vendor_customer_summary_date UNIQUE (vendor_id, summary_date),
    CONSTRAINT fk_cust_insights_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_payouts (
    payout_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    payout_period_start DATE NOT NULL,
    payout_period_end DATE NOT NULL,
    total_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    transaction_ref VARCHAR(100),
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_payouts_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE
);

-- Indexes for optimal analytics and payout queries
CREATE INDEX IF NOT EXISTS idx_sales_summary_vendor_date ON vendor_sales_summary (vendor_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_prod_perf_vendor_date ON vendor_product_performance (vendor_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_prod_perf_product_date ON vendor_product_performance (product_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_cust_insights_vendor_date ON vendor_customer_insights (vendor_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_payouts_vendor_period ON vendor_payouts (vendor_id, payout_period_start, payout_period_end);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON vendor_payouts (status);

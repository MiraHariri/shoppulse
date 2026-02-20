-- ShopPulse Analytics Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TENANTS TABLE
CREATE TABLE tenants (
    tenant_id VARCHAR(10) PRIMARY KEY,
    tenant_name VARCHAR(100) NOT NULL,
    industry VARCHAR(50),
    plan_tier VARCHAR(20),
    country VARCHAR(50),
    created_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_active ON tenants(is_active);

-- 2. USERS TABLE (with cognito_user_id)
CREATE TABLE users (
    user_id VARCHAR(10) PRIMARY KEY,
    tenant_id VARCHAR(10) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL,
    region VARCHAR(10),
    store_id VARCHAR(10),
    is_tenant_admin BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    CONSTRAINT chk_user_role CHECK (role IN ('Admin', 'Finance', 'Operations', 'Marketing')),
    CONSTRAINT chk_user_status CHECK (status IN ('Active', 'Inactive', 'Deleted'))
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cognito ON users(cognito_user_id);
CREATE INDEX idx_users_status ON users(tenant_id, status);

-- 3. ORDERS TABLE
CREATE TABLE orders (
    order_id VARCHAR(20) PRIMARY KEY,
    tenant_id VARCHAR(10) NOT NULL,
    order_date DATE NOT NULL,
    store_id VARCHAR(10),
    region VARCHAR(10),
    channel VARCHAR(20),
    order_status VARCHAR(20),
    items_count INTEGER,
    gross_revenue DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    net_revenue DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_date ON orders(tenant_id, order_date);
CREATE INDEX idx_orders_region ON orders(tenant_id, region);
CREATE INDEX idx_orders_store ON orders(tenant_id, store_id);

-- 4. FULFILLMENT TABLE
CREATE TABLE fulfillment (
    fulfillment_id SERIAL PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    tenant_id VARCHAR(10) NOT NULL,
    warehouse VARCHAR(20),
    carrier VARCHAR(20),
    promised_delivery_date DATE,
    actual_delivery_date DATE,
    fulfillment_status VARCHAR(20),
    sla_met BOOLEAN,
    days_to_ship INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX idx_fulfillment_tenant ON fulfillment(tenant_id);
CREATE INDEX idx_fulfillment_order ON fulfillment(order_id);
CREATE INDEX idx_fulfillment_date ON fulfillment(tenant_id, actual_delivery_date);

-- 5. MARKETING CAMPAIGNS TABLE
CREATE TABLE marketing_campaigns (
    campaign_id VARCHAR(20) PRIMARY KEY,
    tenant_id VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    channel VARCHAR(20),
    spend DECIMAL(10,2),
    impressions INTEGER,
    clicks INTEGER,
    conversions INTEGER,
    revenue_attributed DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX idx_campaigns_tenant ON marketing_campaigns(tenant_id);
CREATE INDEX idx_campaigns_date ON marketing_campaigns(tenant_id, date);
CREATE INDEX idx_campaigns_channel ON marketing_campaigns(tenant_id, channel);

-- 6. ROLE METRIC VISIBILITY TABLE
CREATE TABLE role_metric_visibility (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(10) NOT NULL,
    role VARCHAR(20) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    CONSTRAINT chk_role CHECK (role IN ('Admin', 'Finance', 'Operations', 'Marketing')),
    UNIQUE(tenant_id, role, metric_name)
);

CREATE INDEX idx_role_visibility_tenant ON role_metric_visibility(tenant_id, role);

-- 7. GOVERNANCE RULES TABLE
CREATE TABLE governance_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(10) NOT NULL,
    user_id VARCHAR(10) NOT NULL,
    dimension VARCHAR(50) NOT NULL,
    values TEXT[] NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT chk_governance_dimension CHECK (dimension IN ('region', 'store', 'team', 'custom'))
);

CREATE INDEX idx_governance_tenant ON governance_rules(tenant_id);
CREATE INDEX idx_governance_user ON governance_rules(tenant_id, user_id);

-- 8. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(10) NOT NULL,
    user_id VARCHAR(10),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- Auto-update trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fulfillment_updated_at BEFORE UPDATE ON fulfillment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_visibility_updated_at BEFORE UPDATE ON role_metric_visibility
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_governance_updated_at BEFORE UPDATE ON governance_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

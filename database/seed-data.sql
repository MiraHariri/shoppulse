-- ShopPulse Analytics Seed Data
-- Sample data for testing and development

-- Insert sample tenant data
INSERT INTO tenants (tenant_id, tenant_name, industry, plan_tier, country, created_date, is_active) VALUES
  ('T001', 'Fashion Boutique', 'Retail', 'Premium', 'USA', '2024-01-01', true),
  ('T002', 'Tech Gadgets Inc', 'Electronics', 'Enterprise', 'Canada', '2024-01-15', true),
  ('T003', 'Home Decor Co', 'Home & Garden', 'Standard', 'USA', '2024-02-01', true);

-- Insert default role metric visibility for T001
INSERT INTO role_metric_visibility (tenant_id, role, metric_name, is_visible) VALUES
  ('T001', 'Finance', 'gross_revenue', true),
  ('T001', 'Finance', 'net_revenue', true),
  ('T001', 'Finance', 'discount_amount', true),
  ('T001', 'Finance', 'margin', true),
  ('T001', 'Operations', 'fulfillment_status', true),
  ('T001', 'Operations', 'sla_met', true),
  ('T001', 'Operations', 'days_to_ship', true),
  ('T001', 'Operations', 'inventory_levels', true),
  ('T001', 'Marketing', 'campaign_spend', true),
  ('T001', 'Marketing', 'conversions', true),
  ('T001', 'Marketing', 'revenue_attributed', true),
  ('T001', 'Marketing', 'cac', true),
  ('T001', 'Admin', 'gross_revenue', true),
  ('T001', 'Admin', 'net_revenue', true),
  ('T001', 'Admin', 'fulfillment_status', true),
  ('T001', 'Admin', 'campaign_spend', true);

-- Insert default role metric visibility for T002
INSERT INTO role_metric_visibility (tenant_id, role, metric_name, is_visible) VALUES
  ('T002', 'Finance', 'gross_revenue', true),
  ('T002', 'Finance', 'net_revenue', true),
  ('T002', 'Finance', 'discount_amount', true),
  ('T002', 'Finance', 'margin', true),
  ('T002', 'Operations', 'fulfillment_status', true),
  ('T002', 'Operations', 'sla_met', true),
  ('T002', 'Operations', 'days_to_ship', true),
  ('T002', 'Operations', 'inventory_levels', true),
  ('T002', 'Marketing', 'campaign_spend', true),
  ('T002', 'Marketing', 'conversions', true),
  ('T002', 'Marketing', 'revenue_attributed', true),
  ('T002', 'Marketing', 'cac', true),
  ('T002', 'Admin', 'gross_revenue', true),
  ('T002', 'Admin', 'net_revenue', true),
  ('T002', 'Admin', 'fulfillment_status', true),
  ('T002', 'Admin', 'campaign_spend', true);

-- Insert default role metric visibility for T003
INSERT INTO role_metric_visibility (tenant_id, role, metric_name, is_visible) VALUES
  ('T003', 'Finance', 'gross_revenue', true),
  ('T003', 'Finance', 'net_revenue', true),
  ('T003', 'Finance', 'discount_amount', true),
  ('T003', 'Finance', 'margin', true),
  ('T003', 'Operations', 'fulfillment_status', true),
  ('T003', 'Operations', 'sla_met', true),
  ('T003', 'Operations', 'days_to_ship', true),
  ('T003', 'Operations', 'inventory_levels', true),
  ('T003', 'Marketing', 'campaign_spend', true),
  ('T003', 'Marketing', 'conversions', true),
  ('T003', 'Marketing', 'revenue_attributed', true),
  ('T003', 'Marketing', 'cac', true),
  ('T003', 'Admin', 'gross_revenue', true),
  ('T003', 'Admin', 'net_revenue', true),
  ('T003', 'Admin', 'fulfillment_status', true),
  ('T003', 'Admin', 'campaign_spend', true);

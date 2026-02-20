# ShopPulse Analytics Database

PostgreSQL database schema and initialization scripts for the ShopPulse Analytics platform.

## Files

- `schema.sql` - Complete database schema with 8 tables, indexes, and triggers
- `seed-data.sql` - Sample data for testing and development
- `init-database.sh` - Automated initialization script

## Database Schema Overview

### Tables

1. **tenants** - Tenant organizations
   - Primary key: `tenant_id`
   - Stores tenant metadata (name, industry, plan tier, country)

2. **users** - User accounts
   - Primary key: `user_id`
   - Foreign key: `tenant_id` → tenants
   - Includes `cognito_user_id` for AWS Cognito integration
   - Roles: Admin, Finance, Operations, Marketing

3. **orders** - E-commerce orders
   - Primary key: `order_id`
   - Foreign key: `tenant_id` → tenants
   - Includes revenue, discount, and order status data

4. **fulfillment** - Order fulfillment tracking
   - Primary key: `fulfillment_id` (auto-increment)
   - Foreign keys: `order_id` → orders, `tenant_id` → tenants
   - Tracks shipping, delivery, and SLA metrics

5. **marketing_campaigns** - Marketing campaign data
   - Primary key: `campaign_id`
   - Foreign key: `tenant_id` → tenants
   - Tracks spend, impressions, clicks, conversions, ROI

6. **role_metric_visibility** - Role-based access control
   - Primary key: `id` (auto-increment)
   - Foreign key: `tenant_id` → tenants
   - Defines which metrics each role can see

7. **governance_rules** - Data governance rules
   - Primary key: `rule_id` (UUID)
   - Foreign keys: `tenant_id` → tenants, `user_id` → users
   - Supports region, store, team, and custom dimensions

8. **audit_logs** - Audit trail
   - Primary key: `log_id` (UUID)
   - Foreign keys: `tenant_id` → tenants, `user_id` → users
   - Logs all operations with JSONB details

### Indexes

All tables have indexes on:
- `tenant_id` for multi-tenant query performance
- Foreign key columns
- Frequently queried columns (date, status, etc.)

### Triggers

Auto-update triggers on all tables with `updated_at` columns:
- Automatically sets `updated_at = CURRENT_TIMESTAMP` on UPDATE

## Quick Start

### Prerequisites

- PostgreSQL client tools (psql)
- AWS CLI configured
- jq for JSON parsing
- Access to AWS Secrets Manager

### Initialize Database

```bash
# Set environment variables
export DB_HOST="your-rds-endpoint.rds.amazonaws.com"
export DB_SECRET_ARN="arn:aws:secretsmanager:region:account:secret:name"

# Run initialization script
chmod +x init-database.sh
./init-database.sh
```

The script will:
1. Retrieve credentials from Secrets Manager
2. Test database connection
3. Create database if needed
4. Run schema creation
5. Optionally load seed data
6. Verify tables and triggers

### Manual Setup

If you prefer manual setup:

```bash
# Retrieve credentials
DB_CREDS=$(aws secretsmanager get-secret-value --secret-id $DB_SECRET_ARN --query SecretString --output text)
DB_USER=$(echo $DB_CREDS | jq -r '.username')
DB_PASS=$(echo $DB_CREDS | jq -r '.password')

# Connect to database
export PGPASSWORD=$DB_PASS
psql -h $DB_HOST -U $DB_USER -d postgres

# Create database
CREATE DATABASE shoppulse;
\c shoppulse

# Run schema
\i schema.sql

# Load seed data (optional)
\i seed-data.sql

# Verify
\dt
SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='public';
```

## Schema Details

### Tenant Isolation

All tenant-specific tables include `tenant_id`:
- users
- orders
- fulfillment
- marketing_campaigns
- role_metric_visibility
- governance_rules
- audit_logs

**Critical**: All queries MUST filter by `tenant_id` to ensure data isolation.

### Data Types

- **VARCHAR(10)**: Short IDs (tenant_id, user_id, store_id, region)
- **VARCHAR(20)**: Medium IDs (order_id, campaign_id, role, status)
- **VARCHAR(100)**: Names and emails
- **VARCHAR(255)**: Long strings (cognito_user_id, resource_id)
- **DECIMAL(10,2)**: Currency values
- **INTEGER**: Counts and metrics
- **DATE**: Date-only fields
- **TIMESTAMP**: Date and time with timezone
- **BOOLEAN**: True/false flags
- **UUID**: Unique identifiers (governance_rules, audit_logs)
- **TEXT[]**: Arrays (governance rule values)
- **JSONB**: Structured data (audit log details)
- **INET**: IP addresses

### Constraints

- **Primary Keys**: All tables have primary keys
- **Foreign Keys**: Enforce referential integrity with CASCADE options
- **Unique Constraints**: Prevent duplicates (email, cognito_user_id)
- **Check Constraints**: Validate enum values (role, status, dimension)
- **NOT NULL**: Required fields

### Sample Queries

**Get users for a tenant**:
```sql
SELECT user_id, email, role, status
FROM users
WHERE tenant_id = 'T001' AND status = 'Active'
ORDER BY email;
```

**Get orders with fulfillment data**:
```sql
SELECT o.order_id, o.order_date, o.net_revenue,
       f.fulfillment_status, f.sla_met
FROM orders o
LEFT JOIN fulfillment f ON o.order_id = f.order_id
WHERE o.tenant_id = 'T001'
  AND o.order_date >= '2024-01-01'
ORDER BY o.order_date DESC;
```

**Get marketing campaign ROI**:
```sql
SELECT campaign_id, channel, spend, revenue_attributed,
       CASE WHEN spend > 0 THEN (revenue_attributed / spend) ELSE 0 END as roi
FROM marketing_campaigns
WHERE tenant_id = 'T001'
  AND date BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY roi DESC;
```

**Get governance rules for a user**:
```sql
SELECT dimension, values
FROM governance_rules
WHERE tenant_id = 'T001' AND user_id = 'U001';
```

**Insert audit log**:
```sql
INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address)
VALUES ('T001', 'U001', 'user.created', 'user', 'U002',
        '{"email": "newuser@example.com", "role": "Finance"}'::jsonb,
        '192.168.1.1'::inet);
```

## Seed Data

The seed data includes:

- 3 sample tenants (Fashion Boutique, Tech Gadgets Inc, Home Decor Co)
- Role metric visibility for all roles (Finance, Operations, Marketing, Admin)
- Metrics mapped to appropriate roles

To load seed data:
```bash
psql -h $DB_HOST -U $DB_USER -d shoppulse -f seed-data.sql
```

## Maintenance

### Backup

```bash
# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d shoppulse -F c -f shoppulse_backup.dump

# Restore backup
pg_restore -h $DB_HOST -U $DB_USER -d shoppulse -c shoppulse_backup.dump
```

### Vacuum and Analyze

```sql
-- Vacuum all tables
VACUUM ANALYZE;

-- Vacuum specific table
VACUUM ANALYZE users;
```

### Check Table Sizes

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Index Usage

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Security

### Connection Security

- Always use TLS/SSL connections
- Use RDS Proxy endpoint for Lambda connections
- Store credentials in AWS Secrets Manager
- Rotate credentials regularly

### Query Security

- Use parameterized queries to prevent SQL injection
- Always filter by `tenant_id` in WHERE clauses
- Validate user input before queries
- Use prepared statements

### Access Control

- Grant minimum required permissions
- Use separate database users for different services
- Audit database access regularly
- Monitor audit_logs table

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql -h $DB_HOST -U $DB_USER -d shoppulse -c "SELECT 1;"

# Check if database exists
psql -h $DB_HOST -U $DB_USER -d postgres -c "\l"

# Check active connections
psql -h $DB_HOST -U $DB_USER -d shoppulse -c "SELECT * FROM pg_stat_activity;"
```

### Schema Issues

```bash
# List all tables
psql -h $DB_HOST -U $DB_USER -d shoppulse -c "\dt"

# Describe table structure
psql -h $DB_HOST -U $DB_USER -d shoppulse -c "\d users"

# List all indexes
psql -h $DB_HOST -U $DB_USER -d shoppulse -c "\di"

# List all triggers
psql -h $DB_HOST -U $DB_USER -d shoppulse -c "SELECT * FROM information_schema.triggers;"
```

### Performance Issues

```sql
-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Next Steps

After database setup:

1. Configure Lambda functions with database connection details
2. Implement database connection pooling in Lambda
3. Create database access layer with tenant_id filtering
4. Implement audit logging in all operations
5. Set up monitoring and alerting for database metrics
6. Test multi-tenant data isolation
7. Load production data

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/15/)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)

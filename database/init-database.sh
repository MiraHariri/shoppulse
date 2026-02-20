#!/bin/bash
# Database initialization script for ShopPulse Analytics
# This script connects to the RDS instance and runs the schema and seed data scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}ShopPulse Analytics - Database Initialization${NC}"
echo "================================================"

# Check if required environment variables are set
if [ -z "$DB_HOST" ]; then
    echo -e "${RED}Error: DB_HOST environment variable is not set${NC}"
    exit 1
fi

if [ -z "$DB_SECRET_ARN" ]; then
    echo -e "${RED}Error: DB_SECRET_ARN environment variable is not set${NC}"
    exit 1
fi

# Retrieve database credentials from AWS Secrets Manager
echo -e "${YELLOW}Retrieving database credentials from Secrets Manager...${NC}"
DB_CREDENTIALS=$(aws secretsmanager get-secret-value --secret-id "$DB_SECRET_ARN" --query SecretString --output text)

DB_USERNAME=$(echo "$DB_CREDENTIALS" | jq -r '.username')
DB_PASSWORD=$(echo "$DB_CREDENTIALS" | jq -r '.password')
DB_NAME=${DB_NAME:-shoppulse}
DB_PORT=${DB_PORT:-5432}

if [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Error: Failed to retrieve database credentials${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Credentials retrieved successfully${NC}"

# Export PGPASSWORD for psql
export PGPASSWORD="$DB_PASSWORD"

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}Error: Failed to connect to database${NC}"
    exit 1
fi

# Check if database exists, create if not
echo -e "${YELLOW}Checking if database '$DB_NAME' exists...${NC}"
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" != "1" ]; then
    echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${GREEN}✓ Database already exists${NC}"
fi

# Run schema creation script
echo -e "${YELLOW}Running schema creation script...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -f "$(dirname "$0")/schema.sql"
echo -e "${GREEN}✓ Schema created successfully${NC}"

# Ask if user wants to load seed data
read -p "Do you want to load seed data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Loading seed data...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -f "$(dirname "$0")/seed-data.sql"
    echo -e "${GREEN}✓ Seed data loaded successfully${NC}"
fi

# Verify tables were created
echo -e "${YELLOW}Verifying table creation...${NC}"
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")

echo -e "${GREEN}✓ Found $TABLE_COUNT tables in the database${NC}"

# List created tables
echo -e "${YELLOW}Tables created:${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c "\dt"

# Verify triggers
echo -e "${YELLOW}Verifying triggers...${NC}"
TRIGGER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='public'")
echo -e "${GREEN}✓ Found $TRIGGER_COUNT triggers${NC}"

# Clean up
unset PGPASSWORD

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Database initialization completed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Database Details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  Username: $DB_USERNAME"
echo ""
echo "Next steps:"
echo "  1. Update Lambda environment variables with database connection details"
echo "  2. Configure RDS Proxy endpoint in Lambda functions"
echo "  3. Test database connectivity from Lambda functions"

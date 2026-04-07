#!/bin/bash

# My Money Control - Database Setup Script
# This script helps set up the database for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DB_NAME="${DB_NAME:-my_money_control}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo -e "${GREEN}My Money Control - Database Setup${NC}"
echo "=================================="
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql command not found. Please install PostgreSQL client.${NC}"
    exit 1
fi

# Function to execute SQL file
execute_sql() {
    local file=$1
    local description=$2
    
    echo -e "${YELLOW}Executing: ${description}...${NC}"
    if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ${description} completed successfully${NC}"
    else
        echo -e "${RED}✗ Error executing ${description}${NC}"
        exit 1
    fi
}

# Main menu
echo "Select an option:"
echo "1) Create database and schema"
echo "2) Drop all tables (WARNING: This will delete all data!)"
echo "3) Reset database (drop + create)"
echo "4) Load seed data"
echo "5) Create views"
echo ""
read -p "Enter option [1-5]: " option

case $option in
    1)
        echo -e "${YELLOW}Creating database if it doesn't exist...${NC}"
        PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists or error occurred"
        execute_sql "schema.sql" "Schema creation"
        execute_sql "views.sql" "Views creation"
        echo -e "${GREEN}Database setup completed!${NC}"
        ;;
    2)
        read -p "Are you sure you want to drop all tables? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            execute_sql "drop.sql" "Dropping all tables"
            echo -e "${GREEN}All tables dropped!${NC}"
        else
            echo "Operation cancelled."
        fi
        ;;
    3)
        read -p "Are you sure you want to reset the database? This will delete all data! (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            execute_sql "drop.sql" "Dropping all tables"
            execute_sql "schema.sql" "Schema creation"
            execute_sql "views.sql" "Views creation"
            echo -e "${GREEN}Database reset completed!${NC}"
        else
            echo "Operation cancelled."
        fi
        ;;
    4)
        execute_sql "seed.sql" "Loading seed data"
        echo -e "${GREEN}Seed data loaded!${NC}"
        ;;
    5)
        execute_sql "views.sql" "Views creation"
        echo -e "${GREEN}Views created!${NC}"
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac


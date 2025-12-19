#!/bin/bash

# ============================================
# Watershed Campground - Test Environment Setup
# ============================================
# This script sets up a complete local test environment:
# 1. Starts local Supabase (PostgreSQL + Auth)
# 2. Resets database and runs all migrations
# 3. Seeds test data (campsites, reservations, admin user)
# 4. Optionally starts Next.js dev server
# 5. Optionally runs Playwright tests
#
# Usage:
#   ./scripts/test-setup.sh              # Setup only
#   ./scripts/test-setup.sh --dev        # Setup + start dev server
#   ./scripts/test-setup.sh --test       # Setup + run tests
#   ./scripts/test-setup.sh --dev --test # Setup + dev server + run tests
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
START_DEV=false
RUN_TESTS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            START_DEV=true
            shift
            ;;
        --test)
            RUN_TESTS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev     Start Next.js dev server after setup"
            echo "  --test    Run Playwright tests after setup"
            echo "  --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                 # Setup test environment only"
            echo "  $0 --dev           # Setup + start dev server"
            echo "  $0 --test          # Setup + run tests"
            echo "  $0 --dev --test    # Setup + dev server + tests"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Watershed Campground - Test Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================
# Step 1: Check Prerequisites
# ============================================
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✓ All prerequisites satisfied${NC}"
echo ""

# ============================================
# Step 2: Check .env.test
# ============================================
echo -e "${YELLOW}[2/6] Checking .env.test configuration...${NC}"

if [ ! -f ".env.test" ]; then
    echo -e "${RED}Error: .env.test file not found${NC}"
    echo "Please create .env.test with local Supabase credentials"
    echo "Run 'npx supabase start' first to get the credentials"
    exit 1
fi

# Verify required variables exist
required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "TEST_ADMIN_EMAIL" "TEST_ADMIN_PASSWORD")
for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env.test; then
        echo -e "${RED}Error: $var not found in .env.test${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ .env.test configured correctly${NC}"
echo ""

# ============================================
# Step 3: Start Supabase
# ============================================
echo -e "${YELLOW}[3/6] Starting local Supabase...${NC}"

# Check if Supabase is already running
if npx supabase status &> /dev/null; then
    echo -e "${BLUE}Supabase is already running. Stopping and restarting...${NC}"
    npx supabase stop
fi

# Start Supabase
npx supabase start

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Supabase started successfully${NC}"
else
    echo -e "${RED}Error: Failed to start Supabase${NC}"
    exit 1
fi

echo ""

# ============================================
# Step 4: Reset Database & Run Migrations
# ============================================
echo -e "${YELLOW}[4/6] Resetting database and running migrations...${NC}"

npx supabase db reset

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database reset and migrations applied${NC}"
else
    echo -e "${RED}Error: Database reset failed${NC}"
    exit 1
fi

echo ""

# ============================================
# Step 5: Verify Seed Data
# ============================================
echo -e "${YELLOW}[5/6] Verifying seed data...${NC}"

# Use Supabase CLI to query the database
CAMPSITE_COUNT=$(npx supabase db query "SELECT COUNT(*) FROM campsites" --no-schema --csv | tail -n 1)
RESERVATION_COUNT=$(npx supabase db query "SELECT COUNT(*) FROM reservations" --no-schema --csv | tail -n 1)
ADMIN_COUNT=$(npx supabase db query "SELECT COUNT(*) FROM auth.users WHERE email = 'admin@test.com'" --no-schema --csv | tail -n 1)

echo -e "${BLUE}Seed Data Summary:${NC}"
echo "  - Campsites: $CAMPSITE_COUNT"
echo "  - Reservations: $RESERVATION_COUNT"
echo "  - Admin Users: $ADMIN_COUNT"

if [ "$CAMPSITE_COUNT" -lt 1 ] || [ "$ADMIN_COUNT" -lt 1 ]; then
    echo -e "${RED}Warning: Seed data may be incomplete${NC}"
    echo "Expected at least 1 campsite and 1 admin user"
else
    echo -e "${GREEN}✓ Seed data loaded successfully${NC}"
fi

echo ""

# ============================================
# Step 6: Summary & Next Steps
# ============================================
echo -e "${YELLOW}[6/6] Test environment ready!${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Environment Setup Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Supabase Studio:${NC} http://localhost:54323"
echo -e "${BLUE}PostgreSQL:${NC} postgresql://postgres:postgres@localhost:54322/postgres"
echo -e "${BLUE}Test Admin:${NC} admin@test.com / testpass123"
echo ""

# ============================================
# Optional: Start Dev Server
# ============================================
if [ "$START_DEV" = true ]; then
    echo -e "${YELLOW}Starting Next.js dev server...${NC}"
    echo ""

    # Kill any existing process on port 3000
    if lsof -ti:3000 &> /dev/null; then
        echo -e "${BLUE}Killing existing process on port 3000...${NC}"
        kill -9 $(lsof -ti:3000) 2>/dev/null || true
    fi

    # Start dev server in background if tests will run, otherwise in foreground
    if [ "$RUN_TESTS" = true ]; then
        npm run dev > /dev/null 2>&1 &
        DEV_PID=$!
        echo -e "${GREEN}✓ Dev server started (PID: $DEV_PID)${NC}"

        # Wait for dev server to be ready
        echo -e "${BLUE}Waiting for dev server to be ready...${NC}"
        for i in {1..30}; do
            if curl -s http://localhost:3000 > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Dev server is ready${NC}"
                break
            fi
            sleep 1
        done
    else
        echo -e "${BLUE}Dev server running on http://localhost:3000${NC}"
        echo ""
        npm run dev
        exit 0
    fi
fi

# ============================================
# Optional: Run Tests
# ============================================
if [ "$RUN_TESTS" = true ]; then
    echo ""
    echo -e "${YELLOW}Running Playwright tests...${NC}"
    echo ""

    # Remove old auth state to force re-authentication
    rm -rf tests/.auth/admin.json

    # Run tests
    npx playwright test "$@"
    TEST_EXIT_CODE=$?

    # Kill dev server if we started it
    if [ "$START_DEV" = true ] && [ -n "$DEV_PID" ]; then
        echo ""
        echo -e "${BLUE}Stopping dev server...${NC}"
        kill $DEV_PID 2>/dev/null || true
    fi

    # Show test report if tests failed
    if [ $TEST_EXIT_CODE -ne 0 ]; then
        echo ""
        echo -e "${RED}Tests failed. Opening report...${NC}"
        npx playwright show-report
    else
        echo ""
        echo -e "${GREEN}✓ All tests passed${NC}"
    fi

    exit $TEST_EXIT_CODE
fi

# ============================================
# Final Instructions
# ============================================
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Start dev server: npm run dev"
echo "  2. Run all tests: npx playwright test"
echo "  3. Run admin tests: npx playwright test tests/admin/"
echo "  4. Run guest tests: npx playwright test tests/guest-"
echo "  5. View test report: npx playwright show-report"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  - Stop Supabase: npx supabase stop"
echo "  - View DB: http://localhost:54323"
echo "  - Reset DB: npx supabase db reset"
echo ""

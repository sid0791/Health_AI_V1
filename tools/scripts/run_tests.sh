#!/bin/bash

# Run Tests Script
# Executes comprehensive test suite across the entire monorepo

set -e

echo "🧪 Running HealthCoachAI Test Suite"
echo "==================================="

# Function to run tests with proper error handling
run_test_suite() {
    local test_type=$1
    local command=$2
    
    echo ""
    echo "📋 Running $test_type tests..."
    echo "-----------------------------------"
    
    if eval "$command"; then
        echo "✅ $test_type tests passed"
    else
        echo "❌ $test_type tests failed"
        return 1
    fi
}

# Lint tests
run_test_suite "Lint" "pnpm run lint"

# Type checking
run_test_suite "TypeScript" "pnpm run typecheck"

# Unit tests
run_test_suite "Unit" "pnpm run test:unit"

# Integration tests (if available)
if [ -f "scripts/test-phase-13-integration.sh" ]; then
    run_test_suite "Integration" "./scripts/test-phase-13-integration.sh"
fi

# Backend specific tests
if [ -d "services/backend" ]; then
    echo ""
    echo "🔧 Running backend-specific tests..."
    cd services/backend
    
    if [ -f "package.json" ]; then
        run_test_suite "Backend Unit" "pnpm test"
        run_test_suite "Backend e2e" "pnpm test:e2e"
    fi
    
    cd ../..
fi

# Security tests
run_test_suite "Security Scan" "pnpm run security:scan"

echo ""
echo "🎉 All tests completed successfully!"
echo "=================================="
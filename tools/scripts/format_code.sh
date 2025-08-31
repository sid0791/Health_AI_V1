#!/bin/bash

# Format Code Script
# Formats code across the entire monorepo

set -e

echo "🎨 Formatting HealthCoachAI Code"
echo "================================"

# Function to run formatting with proper error handling
run_format() {
    local format_type=$1
    local command=$2
    
    echo ""
    echo "📋 Running $format_type formatting..."
    echo "------------------------------------"
    
    if eval "$command"; then
        echo "✅ $format_type formatting completed"
    else
        echo "❌ $format_type formatting failed"
        return 1
    fi
}

# Prettier formatting
run_format "Prettier" "pnpm run format:prettier"

# ESLint auto-fix
run_format "ESLint Auto-fix" "pnpm run lint:eslint --fix"

# TypeScript imports organization (if available)
if command -v organize-imports-cli &> /dev/null; then
    run_format "TypeScript Imports" "organize-imports-cli **/*.ts **/*.tsx"
fi

echo ""
echo "🎉 Code formatting completed!"
echo "============================="
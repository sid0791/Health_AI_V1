#!/bin/bash

# Lint All Script
# Runs linting across the entire monorepo

set -e

echo "🔍 Running HealthCoachAI Linting Suite"
echo "======================================"

# Function to run linting with proper error handling
run_lint() {
    local lint_type=$1
    local command=$2
    
    echo ""
    echo "📋 Running $lint_type linting..."
    echo "-----------------------------------"
    
    if eval "$command"; then
        echo "✅ $lint_type linting passed"
    else
        echo "❌ $lint_type linting failed"
        return 1
    fi
}

# ESLint
run_lint "ESLint" "pnpm run lint:eslint"

# Prettier
run_lint "Prettier" "pnpm run lint:prettier"

# TypeScript
run_lint "TypeScript" "pnpm run typecheck"

# Dockerfile linting (if hadolint is available)
if command -v hadolint &> /dev/null; then
    echo ""
    echo "🐳 Linting Dockerfiles..."
    find . -name "Dockerfile*" -type f | while read -r dockerfile; do
        echo "Checking $dockerfile"
        hadolint "$dockerfile"
    done
    echo "✅ Dockerfile linting passed"
fi

# YAML linting (if yamllint is available)
if command -v yamllint &> /dev/null; then
    run_lint "YAML" "yamllint ."
fi

# Shell script linting (if shellcheck is available)
if command -v shellcheck &> /dev/null; then
    echo ""
    echo "🐚 Linting shell scripts..."
    find . -name "*.sh" -type f | while read -r script; do
        echo "Checking $script"
        shellcheck "$script" || echo "Warning: $script has shellcheck issues"
    done
    echo "✅ Shell script linting completed"
fi

echo ""
echo "🎉 All linting completed!"
echo "========================"
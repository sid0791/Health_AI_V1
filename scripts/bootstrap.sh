#!/bin/bash

# Bootstrap Script
# Initial setup for the HealthCoachAI repository

set -e

echo "🚀 Bootstrapping HealthCoachAI Repository"
echo "========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the repository root"
    exit 1
fi

# Install pnpm if not available
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup git hooks
echo "🪝 Setting up git hooks..."
if [ -d ".husky" ]; then
    pnpm exec husky install
    echo "✅ Git hooks installed"
fi

# Create necessary directories
echo "📁 Creating directory structure..."
mkdir -p data/seeds/recipes data/seeds/exercises data/seeds/lookups
mkdir -p data/mappings data/schemas data/samples/reports data/samples/fixtures
mkdir -p tests/unit tests/integration tests/e2e tests/performance tests/security
mkdir -p tools/codegen tools/lint-config tools/analyzers
mkdir -p scripts/ci scripts/db

echo "✅ Directory structure created"

# Copy environment files
echo "⚙️  Setting up environment files..."
./tools/scripts/setup_dev_env.sh

# Initial build
echo "🔨 Initial build..."
pnpm run build

echo ""
echo "🎉 Repository bootstrap completed!"
echo "================================="
echo ""
echo "Next steps:"
echo "1. Configure your environment variables"
echo "2. Set up your development database"
echo "3. Start development: pnpm run dev"
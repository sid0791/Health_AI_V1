#!/bin/bash

# Development Environment Setup Script
# Sets up the complete HealthCoachAI development environment

set -e

echo "🚀 Setting up HealthCoachAI Development Environment"
echo "=================================================="

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version must be 20 or higher. Current: $(node --version)"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

echo "✅ pnpm version: $(pnpm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup environment files
echo "⚙️  Setting up environment files..."
if [ ! -f "services/backend/.env" ]; then
    cp services/backend/.env.example services/backend/.env
    echo "📝 Created services/backend/.env from template"
fi

if [ ! -f "apps/mobile/ios/.env" ]; then
    cp apps/mobile/ios/.env.example apps/mobile/ios/.env
    echo "📝 Created apps/mobile/ios/.env from template"
fi

if [ ! -f "apps/mobile/android/.env" ]; then
    cp apps/mobile/android/.env.example apps/mobile/android/.env
    echo "📝 Created apps/mobile/android/.env from template"
fi

if [ ! -f "n8n/.env" ]; then
    cp n8n/.env.example n8n/.env
    echo "📝 Created n8n/.env from template"
fi

# Build the project
echo "🔨 Building the project..."
pnpm run build

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your environment variables in the .env files"
echo "2. Set up your database: pnpm run db:setup"
echo "3. Start development: pnpm run dev"
echo ""
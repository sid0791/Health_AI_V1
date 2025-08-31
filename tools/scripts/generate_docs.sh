#!/bin/bash

# Generate Documentation Script
# Generates documentation for the HealthCoachAI project

set -e

echo "📚 Generating HealthCoachAI Documentation"
echo "========================================="

# Function to generate docs with proper error handling
generate_docs() {
    local doc_type=$1
    local command=$2
    
    echo ""
    echo "📋 Generating $doc_type documentation..."
    echo "---------------------------------------"
    
    if eval "$command"; then
        echo "✅ $doc_type documentation generated"
    else
        echo "❌ $doc_type documentation generation failed"
        return 1
    fi
}

# API Documentation (OpenAPI/Swagger)
if [ -f "services/backend/openapi/schema.json" ]; then
    generate_docs "API" "cd services/backend && pnpm run docs:generate"
fi

# TypeScript Documentation (if TypeDoc is available)
if command -v typedoc &> /dev/null; then
    generate_docs "TypeScript" "typedoc --out docs/api-reference services/backend/src"
fi

# Database Schema Documentation
if [ -f "services/backend/prisma/schema.prisma" ]; then
    echo ""
    echo "📋 Generating database schema documentation..."
    cd services/backend
    if command -v prisma &> /dev/null; then
        prisma generate
        echo "✅ Database schema documentation updated"
    fi
    cd ../..
fi

# Design System Documentation (if Storybook is available)
if [ -f "packages/design-tokens/package.json" ]; then
    echo ""
    echo "📋 Building design tokens documentation..."
    cd packages/design-tokens
    pnpm run build
    echo "✅ Design tokens built"
    cd ../..
fi

echo ""
echo "🎉 Documentation generation completed!"
echo "====================================="
echo ""
echo "Generated documentation:"
echo "- API docs: docs/api/"
echo "- TypeScript docs: docs/api-reference/"
echo "- Database schema: services/backend/prisma/generated/"
echo "- Design tokens: packages/design-tokens/dist/"
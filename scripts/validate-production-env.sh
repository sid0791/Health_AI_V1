#!/bin/bash

# Production Environment Validation Script
# This script validates that all required environment variables are set for production deployment

set -e

echo "🚀 Validating Production Environment Configuration..."
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Check if environment variable is set and not a demo value
check_env_var() {
    local var_name=$1
    local var_value="${!var_name}"
    local is_required=${2:-true}
    local demo_patterns=("demo" "test" "example" "replace" "your-" "REPLACE_WITH")
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -z "$var_value" ]; then
        if [ "$is_required" = true ]; then
            echo -e "${RED}❌ FAILED: $var_name is not set${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        else
            echo -e "${YELLOW}⚠️  WARNING: $var_name is not set (optional)${NC}"
            WARNINGS=$((WARNINGS + 1))
            return 0
        fi
    fi
    
    # Check for demo/placeholder values
    for pattern in "${demo_patterns[@]}"; do
        if [[ "$var_value" == *"$pattern"* ]]; then
            echo -e "${RED}❌ FAILED: $var_name contains demo/placeholder value: $var_value${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        fi
    done
    
    echo -e "${GREEN}✅ PASSED: $var_name is properly configured${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
}

# Check Node.js version
check_node_version() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if command -v node >/dev/null 2>&1; then
        node_version=$(node --version | cut -d'v' -f2)
        major_version=$(echo $node_version | cut -d'.' -f1)
        
        if [ "$major_version" -ge 20 ]; then
            echo -e "${GREEN}✅ PASSED: Node.js version $node_version (>= 20.0.0)${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            echo -e "${RED}❌ FAILED: Node.js version $node_version is too old (requires >= 20.0.0)${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    else
        echo -e "${RED}❌ FAILED: Node.js is not installed${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Load environment file if provided
if [ -f ".env.production" ]; then
    echo "📋 Loading .env.production file..."
    set -a
    source .env.production
    set +a
elif [ -f ".env" ]; then
    echo "📋 Loading .env file..."
    set -a
    source .env
    set +a
else
    echo -e "${YELLOW}⚠️  No .env file found, checking system environment variables${NC}"
fi

echo ""
echo "🔍 Environment Configuration Checks:"
echo "======================================"

# Core Application Settings
echo ""
echo "📱 Core Application Settings:"
check_env_var "NODE_ENV"
check_env_var "PORT"
check_env_var "API_BASE_URL"
check_env_var "APP_ORIGIN"

# Database Configuration
echo ""
echo "🗄️  Database Configuration:"
check_env_var "DB_HOST"
check_env_var "DB_USERNAME"
check_env_var "DB_PASSWORD"
check_env_var "DB_NAME"
check_env_var "POSTGRES_URL"

# Redis Configuration
echo ""
echo "⚡ Redis Configuration:"
check_env_var "REDIS_HOST"
check_env_var "REDIS_URL"
check_env_var "REDIS_PASSWORD" false

# JWT Configuration
echo ""
echo "🔐 JWT Configuration:"
check_env_var "JWT_SECRET"
check_env_var "JWT_ISSUER"

# OAuth Providers
echo ""
echo "🔑 OAuth Providers:"
check_env_var "GOOGLE_CLIENT_ID"
check_env_var "GOOGLE_CLIENT_SECRET"
check_env_var "APPLE_CLIENT_ID" false
check_env_var "FACEBOOK_APP_ID" false

# AI Providers
echo ""
echo "🤖 AI Providers:"
check_env_var "OPENAI_API_KEY" false
check_env_var "ANTHROPIC_API_KEY" false
check_env_var "GOOGLE_VERTEX_PROJECT" false

# Object Storage
echo ""
echo "☁️  Object Storage:"
check_env_var "S3_BUCKET"
check_env_var "S3_ACCESS_KEY"
check_env_var "S3_SECRET_KEY"

# Security Configuration
echo ""
echo "🛡️  Security Configuration:"
check_env_var "BCRYPT_ROUNDS"
check_env_var "CORS_ORIGINS"

# Infrastructure Checks
echo ""
echo "🏗️  Infrastructure Checks:"
check_node_version

# Check if package.json exists
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ PASSED: package.json exists${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}❌ FAILED: package.json not found${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Check if node_modules exists (dependencies installed)
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ PASSED: Dependencies installed (node_modules exists)${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  WARNING: node_modules not found - run 'npm install'${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Security Checks
echo ""
echo "🔒 Security Checks:"

# Check for .env files in root (should not be committed)
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f ".env" ] && [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore; then
        echo -e "${GREEN}✅ PASSED: .env is properly gitignored${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ FAILED: .env exists but not in .gitignore${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
else
    echo -e "${GREEN}✅ PASSED: No .env file in root (good for production)${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

# Check for demo values in environment
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ "$NODE_ENV" = "production" ]; then
    if [ -n "$DB_PASSWORD" ] && [[ "$DB_PASSWORD" != *"demo"* ]] && [[ "$DB_PASSWORD" != *"example"* ]]; then
        echo -e "${GREEN}✅ PASSED: Production database password is set${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ FAILED: Database password appears to be demo/placeholder value${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: NODE_ENV is not set to 'production'${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "📊 VALIDATION SUMMARY:"
echo "======================"
echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"

percentage=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
echo ""
echo -e "Production Readiness: ${GREEN}${percentage}%${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 PRODUCTION READY!${NC}"
    echo "All critical environment variables are properly configured."
    exit 0
else
    echo ""
    echo -e "${RED}❌ NOT PRODUCTION READY${NC}"
    echo "Please fix the failed checks before deploying to production."
    echo ""
    echo "📚 For help with environment configuration, see:"
    echo "   - .env.production.example"
    echo "   - PRODUCTION_DEPLOYMENT_GUIDE.md"
    exit 1
fi
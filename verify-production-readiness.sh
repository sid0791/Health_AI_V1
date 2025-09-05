#!/bin/bash

# Production Deployment Verification Script
# Verifies all components are ready for production deployment

echo "🚀 Health AI V1 - Production Deployment Verification"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FAILED_CHECKS=0
TOTAL_CHECKS=0

check_status() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo ""
echo "1. 🔧 Backend Service Verification"
echo "=================================="

cd services/backend

# Check if package.json exists
check_status $([[ -f "package.json" ]] && echo 0 || echo 1) "Backend package.json exists"

# Check if .env.production exists
check_status $([[ -f ".env.production" ]] && echo 0 || echo 1) "Production environment file exists"

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [[ "$NODE_VERSION" -ge 18 ]]; then
    check_status 0 "Node.js version >= 18 ($NODE_VERSION)"
else
    check_status 1 "Node.js version >= 18 (current: $NODE_VERSION)"
fi

# Check if TypeScript compiles
echo "Checking TypeScript compilation..."
npm run build:prod > /dev/null 2>&1
check_status $? "Backend TypeScript compilation"

# Check if critical modules exist
check_status $([[ -d "src/domains/auth" ]] && echo 0 || echo 1) "Auth module exists"
check_status $([[ -d "src/domains/chat" ]] && echo 0 || echo 1) "Chat module exists"
check_status $([[ -d "src/domains/health-reports" ]] && echo 0 || echo 1) "Health reports module exists"
check_status $([[ -d "src/domains/meal-planning" ]] && echo 0 || echo 1) "Meal planning module exists"

# Check environment variables
if [[ -f ".env.production" ]]; then
    echo "Checking critical environment variables..."
    
    # Database
    grep -q "DATABASE_URL=" .env.production
    check_status $? "DATABASE_URL configured"
    
    # JWT
    grep -q "JWT_SECRET=" .env.production
    check_status $? "JWT_SECRET configured"
    
    # AI APIs (at least one should be configured)
    AI_CONFIGURED=0
    if grep -q "GOOGLE_AI_API_KEY=" .env.production && [[ $(grep "GOOGLE_AI_API_KEY=" .env.production | cut -d'=' -f2) != "" ]]; then
        AI_CONFIGURED=1
    fi
    if grep -q "GROQ_API_KEY=" .env.production && [[ $(grep "GROQ_API_KEY=" .env.production | cut -d'=' -f2) != "" ]]; then
        AI_CONFIGURED=1
    fi
    if grep -q "HUGGINGFACE_API_KEY=" .env.production && [[ $(grep "HUGGINGFACE_API_KEY=" .env.production | cut -d'=' -f2) != "" ]]; then
        AI_CONFIGURED=1
    fi
    
    check_status $AI_CONFIGURED "At least one AI API key configured"
    
    # OAuth
    grep -q "GOOGLE_CLIENT_ID=" .env.production
    check_status $? "Google OAuth configured"
else
    warning "Production environment file not found - create .env.production"
fi

cd ../..

echo ""
echo "2. 🌐 Frontend Service Verification"
echo "==================================="

cd apps/web

# Check if package.json exists
check_status $([[ -f "package.json" ]] && echo 0 || echo 1) "Frontend package.json exists"

# Check if Next.js builds successfully
echo "Checking Next.js build..."
npm run build > /dev/null 2>&1
check_status $? "Frontend Next.js build"

# Check critical pages exist
check_status $([[ -f "src/app/page.tsx" ]] && echo 0 || echo 1) "Landing page exists"
check_status $([[ -f "src/app/auth/page.tsx" ]] && echo 0 || echo 1) "Auth page exists"
check_status $([[ -f "src/app/dashboard/page.tsx" ]] && echo 0 || echo 1) "Dashboard page exists"
check_status $([[ -f "src/app/chat/page.tsx" ]] && echo 0 || echo 1) "Chat page exists"
check_status $([[ -f "src/app/health-reports/page.tsx" ]] && echo 0 || echo 1) "Health reports page exists"
check_status $([[ -f "src/app/meal-plan/page.tsx" ]] && echo 0 || echo 1) "Meal plan page exists"
check_status $([[ -f "src/app/onboarding/page.tsx" ]] && echo 0 || echo 1) "Onboarding page exists"

# Check API services exist
check_status $([[ -f "src/services/api.ts" ]] && echo 0 || echo 1) "API service exists"
check_status $([[ -f "src/services/chatService.ts" ]] && echo 0 || echo 1) "Chat service exists"
check_status $([[ -f "src/services/healthReportsService.ts" ]] && echo 0 || echo 1) "Health reports service exists"
check_status $([[ -f "src/services/realAIMealPlanningService.ts" ]] && echo 0 || echo 1) "Meal planning service exists"
check_status $([[ -f "src/services/enhancedChatService.ts" ]] && echo 0 || echo 1) "Enhanced chat service exists"

# Check environment configuration
if [[ -f ".env.local" ]]; then
    grep -q "NEXT_PUBLIC_API_URL=" .env.local
    check_status $? "API URL configured for frontend"
else
    warning "Frontend environment file (.env.local) not found"
fi

cd ../..

echo ""
echo "3. 📊 Database & Infrastructure"
echo "==============================="

# Check if database migration files exist
check_status $([[ -d "services/backend/database/migrations" ]] && echo 0 || echo 1) "Database migrations exist"

# Check Docker configuration
check_status $([[ -f "services/backend/Dockerfile" ]] && echo 0 || echo 1) "Backend Dockerfile exists"

# Check if PM2 ecosystem file exists
check_status $([[ -f "services/backend/ecosystem.config.js" ]] && echo 0 || echo 1) "PM2 ecosystem file exists"

echo ""
echo "4. 🔒 Security & Configuration"
echo "=============================="

# Check gitignore
check_status $([[ -f ".gitignore" ]] && echo 0 || echo 1) ".gitignore exists"

if [[ -f ".gitignore" ]]; then
    grep -q ".env" .gitignore
    check_status $? "Environment files in .gitignore"
    
    grep -q "node_modules" .gitignore
    check_status $? "node_modules in .gitignore"
fi

# Check for secrets in codebase (basic check)
SECRETS_FOUND=$(grep -r "api_key\|secret\|password" --include="*.ts" --include="*.js" --include="*.json" services/ apps/ 2>/dev/null | grep -v "placeholder\|example\|TODO\|FIXME" | wc -l)
if [[ $SECRETS_FOUND -eq 0 ]]; then
    check_status 0 "No hardcoded secrets found"
else
    check_status 1 "Potential hardcoded secrets found ($SECRETS_FOUND occurrences)"
fi

echo ""
echo "5. 🧪 API Integration Tests"
echo "==========================="

# Test if backend can start (quick check)
cd services/backend
timeout 10s npm run start:dev > /dev/null 2>&1 &
BACKEND_PID=$!
sleep 5

# Check if backend is responding
curl -s http://localhost:8080/api/health > /dev/null 2>&1
BACKEND_RUNNING=$?

if [[ $BACKEND_PID ]]; then
    kill $BACKEND_PID 2>/dev/null
fi

check_status $([[ $BACKEND_RUNNING -eq 0 ]] && echo 0 || echo 1) "Backend health check responds"

cd ../..

echo ""
echo "6. 📝 Documentation & Guides"
echo "============================"

check_status $([[ -f "README.md" ]] && echo 0 || echo 1) "README.md exists"
check_status $([[ -f "PRODUCTION_DEPLOYMENT_GUIDE.md" ]] && echo 0 || echo 1) "Production deployment guide exists"
check_status $([[ -f "AI_MEAL_PLANNING_PARAMETERS.md" ]] && echo 0 || echo 1) "AI meal planning documentation exists"
check_status $([[ -f "STEP_BY_STEP_API_SETUP.md" ]] && echo 0 || echo 1) "API setup guide exists"

echo ""
echo "7. 🎯 Feature Completeness"
echo "=========================="

# Check if all core features are implemented
info "Verifying implemented features..."
check_status $([[ -f "apps/web/src/app/chat/page.tsx" ]] && echo 0 || echo 1) "AI Chat feature"
check_status $([[ -f "apps/web/src/app/health-reports/page.tsx" ]] && echo 0 || echo 1) "Health Reports feature"
check_status $([[ -f "apps/web/src/app/meal-plan/page.tsx" ]] && echo 0 || echo 1) "Meal Planning feature"
check_status $([[ -f "apps/web/src/app/onboarding/page.tsx" ]] && echo 0 || echo 1) "User Onboarding feature"
check_status $([[ -f "apps/web/src/app/api-test/page.tsx" ]] && echo 0 || echo 1) "API Testing interface"

# Check API endpoints
cd services/backend/src/domains
CHAT_ENDPOINTS=$(find . -name "*.controller.ts" -exec grep -l "chat\|Chat" {} \; | wc -l)
HEALTH_ENDPOINTS=$(find . -name "*.controller.ts" -exec grep -l "health\|Health" {} \; | wc -l)
MEAL_ENDPOINTS=$(find . -name "*.controller.ts" -exec grep -l "meal\|Meal" {} \; | wc -l)

check_status $([[ $CHAT_ENDPOINTS -gt 0 ]] && echo 0 || echo 1) "Chat API endpoints"
check_status $([[ $HEALTH_ENDPOINTS -gt 0 ]] && echo 0 || echo 1) "Health API endpoints"
check_status $([[ $MEAL_ENDPOINTS -gt 0 ]] && echo 0 || echo 1) "Meal planning API endpoints"

cd ../../../..

echo ""
echo "=================================================="
echo "🏁 PRODUCTION READINESS SUMMARY"
echo "=================================================="

PASSED_CHECKS=$((TOTAL_CHECKS - FAILED_CHECKS))
PASS_PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo -e "Total Checks: ${BLUE}$TOTAL_CHECKS${NC}"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo -e "Success Rate: ${BLUE}$PASS_PERCENTAGE%${NC}"

echo ""
if [[ $FAILED_CHECKS -eq 0 ]]; then
    echo -e "${GREEN}🎉 READY FOR PRODUCTION DEPLOYMENT!${NC}"
    echo -e "${GREEN}All verification checks passed successfully.${NC}"
    
    echo ""
    echo "📋 Next Steps for Deployment:"
    echo "1. Set up production database (PostgreSQL)"
    echo "2. Configure production environment variables"
    echo "3. Set up AI API keys (at least one provider)"
    echo "4. Configure OAuth providers"
    echo "5. Deploy backend using PM2 or Docker"
    echo "6. Deploy frontend to Vercel/Netlify"
    echo "7. Set up monitoring and logging"
    
elif [[ $FAILED_CHECKS -le 3 ]]; then
    echo -e "${YELLOW}⚠️  MOSTLY READY - Minor Issues to Address${NC}"
    echo -e "${YELLOW}$FAILED_CHECKS critical issues need to be resolved before production.${NC}"
    
else
    echo -e "${RED}❌ NOT READY FOR PRODUCTION${NC}"
    echo -e "${RED}$FAILED_CHECKS critical issues must be resolved before deployment.${NC}"
fi

echo ""
echo "📚 For detailed deployment instructions, see:"
echo "- PRODUCTION_DEPLOYMENT_GUIDE.md"
echo "- STEP_BY_STEP_API_SETUP.md"
echo "- AI_MEAL_PLANNING_PARAMETERS.md"

exit $FAILED_CHECKS
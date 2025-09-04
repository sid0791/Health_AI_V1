#!/bin/bash
# HealthCoach AI - Codespace Setup Script

# Remove strict error handling to allow script to continue on warnings
# set -e

echo "🚀 Setting up HealthCoach AI for GitHub Codespace..."

# Function to retry commands
retry_command() {
    local cmd="$1"
    local retries=3
    local count=0
    
    while [ $count -lt $retries ]; do
        if eval "$cmd"; then
            return 0
        fi
        count=$((count + 1))
        echo "⚠️ Command failed, retrying ($count/$retries)..."
        sleep 2
    done
    
    echo "❌ Command failed after $retries attempts: $cmd"
    return 1
}

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Create environment files for demo mode
echo "📝 Creating demo environment files..."

# Ensure directories exist
mkdir -p services/backend
mkdir -p apps/web  
mkdir -p n8n

# Backend environment
cat > services/backend/.env << 'EOF'
# HealthCoach AI Backend - Demo Configuration for Codespaces

# Core Configuration
NODE_ENV=development
PORT=8080
API_BASE_URL=http://localhost:8080
APP_ORIGIN=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,https://*.app.github.dev

# Demo Database Configuration (for Codespaces)
# Note: For production, use real PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=healthcoachai
DB_PASSWORD=demo_password_123
DB_NAME=healthcoachai_dev
POSTGRES_URL=postgresql://healthcoachai:demo_password_123@localhost:5432/healthcoachai_dev

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=demo-jwt-secret-for-codespace-development-only
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=1209600

# Demo API Keys (⚠️ REPLACE WITH REAL KEYS FOR PRODUCTION)
OPENAI_API_KEY=demo-openai-key-replace-for-production
ANTHROPIC_API_KEY=demo-anthropic-key-replace-for-production
GOOGLE_CLIENT_ID=demo-google-client-id
GOOGLE_CLIENT_SECRET=demo-google-secret
APPLE_CLIENT_ID=demo-apple-client-id
APPLE_TEAM_ID=demo-apple-team-id
APPLE_KEY_ID=demo-apple-key-id
APPLE_PRIVATE_KEY_B64=demo-apple-private-key

# Demo External Service Keys
TWILIO_ACCOUNT_SID=demo-twilio-sid
TWILIO_AUTH_TOKEN=demo-twilio-token
TWILIO_SERVICE_SID=demo-twilio-service
OPENWEATHER_API_KEY=demo-weather-key
FITBIT_CLIENT_ID=demo-fitbit-client
FITBIT_CLIENT_SECRET=demo-fitbit-secret

# Object Storage (demo/local)
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=healthcoachai-demo
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# Vector Store
PGVECTOR_ENABLED=false

# Feature Flags for Demo
DEMO_MODE=true
SKIP_AUTH_VALIDATION=true
USE_MOCK_AI_RESPONSES=true

EOF

# Web app environment
cat > apps/web/.env.local << 'EOF'
# HealthCoach AI Web App - Demo Configuration

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=demo-nextauth-secret-for-codespace
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_DEMO_MODE=true

# Disable Next.js telemetry to prevent firewall issues
NEXT_TELEMETRY_DISABLED=1

# Demo OAuth (⚠️ REPLACE WITH REAL KEYS FOR PRODUCTION)
GOOGLE_CLIENT_ID=demo-google-client-id
GOOGLE_CLIENT_SECRET=demo-google-secret
APPLE_CLIENT_ID=demo-apple-client-id
APPLE_CLIENT_SECRET=demo-apple-secret
FACEBOOK_CLIENT_ID=demo-facebook-client-id
FACEBOOK_CLIENT_SECRET=demo-facebook-secret

EOF

# n8n environment
cat > n8n/.env << 'EOF'
# n8n Workflow Engine - Demo Configuration

N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_PORT=5678
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=demo123
N8N_ENCRYPTION_KEY=demo-n8n-encryption-key-for-codespace

EOF

echo "✅ Environment files created!"

# Disable Next.js telemetry globally
echo "🔒 Disabling Next.js telemetry to prevent firewall issues..."
export NEXT_TELEMETRY_DISABLED=1
export npm_config_disable_telemetry=true
export DO_NOT_TRACK=1

# Try to disable telemetry, with fallback if Next.js isn't available yet
if command -v npx >/dev/null 2>&1; then
    if command -v next >/dev/null 2>&1; then
        npx next telemetry disable 2>/dev/null || echo "⚠️ Telemetry disable command failed, but environment variables are set"
    else
        echo "⚠️ Next.js CLI not available yet, telemetry will be disabled via environment variables"
    fi
else
    echo "⚠️ npx not available yet, telemetry will be disabled via environment variables"
fi

# Install dependencies if not already done
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    retry_command "pnpm install" || {
        echo "❌ pnpm install failed after retries, trying alternative approach..."
        rm -rf node_modules/.cache 2>/dev/null || true
        retry_command "pnpm install --no-frozen-lockfile" || {
            echo "❌ Could not install dependencies. Please run 'pnpm install' manually."
            echo "✅ Environment files created successfully - setup partially complete"
            exit 0
        }
    }
else
    echo "✅ Dependencies already installed"
fi

# Build the project with better error handling
echo "🔨 Building the project..."
if retry_command "pnpm run build --filter=!@healthcoachai/backend"; then
    echo "✅ Build completed successfully"
else
    echo "⚠️ Build had issues, checking if critical..."
    # Try a simpler build to see if it's a dependency issue
    echo "🔧 Attempting alternative build..."
    if pnpm run build --filter=@healthcoachai/web 2>&1 | tee build.log; then
        echo "✅ Web app build succeeded"
    else
        echo "⚠️ Build issues detected. Continuing anyway for development..."
        echo "💡 You can try running 'pnpm run build' manually later"
    fi
fi

echo "🎉 HealthCoach AI setup complete!"

# Clean up build log
rm -f build.log

echo ""
echo "🔍 Verifying setup..."
if [ -d "node_modules" ] && [ -f "services/backend/.env" ] && [ -f "apps/web/.env.local" ]; then
    echo "✅ Setup verification passed!"
    echo ""
    echo "🌐 Available Services:"
    echo "  • Web App:      http://localhost:3000"
    echo "  • Backend API:  http://localhost:8080"
    echo "  • API Docs:     http://localhost:8080/api/docs"
    echo "  • n8n:          http://localhost:5678"
    echo ""
    echo "🚀 To start the application:"
    echo "  pnpm run dev"
    echo "  ./start-app.sh      # Alternative start script"
    echo ""
    echo "🔧 To verify everything is working:"
    echo "  ./verify-codespace.sh"
else
    echo "⚠️ Setup incomplete. Some components may be missing."
    echo ""
    echo "🛠️ Manual troubleshooting:"
    echo "  • Check dependencies: pnpm install"
    echo "  • Verify environment: ./verify-codespace.sh"
    echo "  • Review logs above for specific errors"
fi
echo ""
echo "📖 See CODESPACE_GUIDE.md for detailed instructions"
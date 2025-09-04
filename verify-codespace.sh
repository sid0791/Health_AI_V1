#!/bin/bash
# HealthCoach AI - Codespace Verification Script

echo "🚀 HealthCoach AI - Codespace Verification"
echo "==========================================="

# Set telemetry environment variables
export NEXT_TELEMETRY_DISABLED=1
export npm_config_disable_telemetry=true
export DO_NOT_TRACK=1

echo ""
echo "✅ Environment Setup:"
echo "  - NEXT_TELEMETRY_DISABLED: $NEXT_TELEMETRY_DISABLED"
echo "  - npm_config_disable_telemetry: $npm_config_disable_telemetry"
echo "  - DO_NOT_TRACK: $DO_NOT_TRACK"

echo ""
echo "🔍 Checking installation..."

# Check Node.js
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
    exit 1
fi

# Check pnpm
if command -v pnpm >/dev/null 2>&1; then
    echo "✅ pnpm: $(pnpm --version)"
else
    echo "❌ pnpm not found"
    exit 1
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Dependencies not installed"
    exit 1
fi

echo ""
echo "🔧 Checking Next.js telemetry status..."
if command -v npx >/dev/null 2>&1; then
    npx next telemetry status 2>/dev/null || echo "⚠️ Could not check telemetry status, but environment variables are set"
else
    echo "⚠️ npx not available for telemetry check, but environment variables are set"
fi

echo ""
echo "🏗️ Testing build process..."
if pnpm run build --filter=@healthcoachai/web >/dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - checking dependencies..."
    if [ ! -d "node_modules" ]; then
        echo "💡 Missing dependencies. Run: pnpm install"
    elif [ ! -f "apps/web/.env.local" ]; then
        echo "💡 Missing environment files. Run: ./.devcontainer/setup.sh"
    else
        echo "💡 Build issues detected. Check: pnpm run build"
    fi
    exit 1
fi

echo ""
echo "🎉 Codespace verification complete!"
echo ""
echo "🚀 Ready to start development:"
echo "  pnpm run dev        # Start all services"
echo "  ./start-app.sh      # Use the existing start script"
echo ""
echo "🌐 Expected services:"
echo "  - Web App:      http://localhost:3000"
echo "  - Backend API:  http://localhost:8080" 
echo "  - API Docs:     http://localhost:8080/api/docs"
echo "  - n8n:          http://localhost:5678"
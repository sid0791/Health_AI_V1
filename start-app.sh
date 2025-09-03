#!/bin/bash
# HealthCoach AI - Quick Start Script for GitHub Codespaces

echo "🚀 HealthCoach AI - Starting Application..."

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "Port $port is already in use"
        return 1
    else
        return 0
    fi
}

# Function to start service in background with logging
start_service() {
    local name=$1
    local command=$2
    local directory=$3
    local port=$4
    
    echo "Starting $name..."
    
    if [ -n "$directory" ]; then
        cd "$directory"
    fi
    
    # Start the service in background
    eval "$command" > "/tmp/${name,,}.log" 2>&1 &
    local pid=$!
    
    echo "$pid" > "/tmp/${name,,}.pid"
    echo "✅ $name started (PID: $pid) on port $port"
    
    # Return to original directory
    cd - > /dev/null 2>&1
}

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "nest start" 2>/dev/null || true

# Set up environment if not exists
if [ ! -f "services/backend/.env" ]; then
    echo "📝 Setting up demo environment..."
    ./.devcontainer/setup.sh
fi

echo ""
echo "🌟 Starting HealthCoach AI Services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start Web Application (Next.js)
start_service "WebApp" "pnpm run dev" "apps/web" "3000"

# Wait a moment for the web app to initialize
sleep 2

# Start Backend API (NestJS) - if backend exists and is configured
if [ -d "services/backend" ]; then
    start_service "Backend" "pnpm run start:dev" "services/backend" "8080"
fi

sleep 3

echo ""
echo "🎉 HealthCoach AI is now running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Web Application:     http://localhost:3000"
echo "🔧 Backend API:         http://localhost:8080"
echo "📚 API Documentation:   http://localhost:8080/api/docs"
echo ""
echo "💡 The web app should automatically open in your browser!"
echo ""
echo "📋 Available Test Scenarios:"
echo "   • User Authentication & Onboarding"
echo "   • AI-Powered Meal Planning"
echo "   • Health Chat Assistant"  
echo "   • Fitness Planning"
echo "   • Health Analytics & Reports"
echo "   • Food Logging"
echo ""
echo "🔍 To view logs:"
echo "   tail -f /tmp/webapp.log    # Web app logs"
echo "   tail -f /tmp/backend.log   # Backend logs"
echo ""
echo "⏹️  To stop services:"
echo "   ./stop-services.sh"
echo ""
echo "📖 For detailed testing guide, see: CODESPACE_GUIDE.md"
echo ""

# Keep script running to show status
while true; do
    sleep 10
    
    # Check if services are still running
    if [ -f "/tmp/webapp.pid" ]; then
        webapp_pid=$(cat /tmp/webapp.pid)
        if ! kill -0 $webapp_pid 2>/dev/null; then
            echo "⚠️  Web app stopped unexpectedly. Check /tmp/webapp.log"
            rm -f /tmp/webapp.pid
        fi
    fi
    
    if [ -f "/tmp/backend.pid" ]; then
        backend_pid=$(cat /tmp/backend.pid)
        if ! kill -0 $backend_pid 2>/dev/null; then
            echo "⚠️  Backend stopped unexpectedly. Check /tmp/backend.log"
            rm -f /tmp/backend.pid
        fi
    fi
done
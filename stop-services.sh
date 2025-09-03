#!/bin/bash
# HealthCoach AI - Stop Services Script

echo "🛑 Stopping HealthCoach AI services..."

# Function to stop service by PID file
stop_service() {
    local name=$1
    local pidfile="/tmp/${name,,}.pid"
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if kill -0 $pid 2>/dev/null; then
            echo "Stopping $name (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                echo "Force stopping $name..."
                kill -9 $pid
            fi
            
            echo "✅ $name stopped"
        fi
        rm -f "$pidfile"
    fi
}

# Stop services
stop_service "WebApp"
stop_service "Backend"

# Kill any remaining processes
pkill -f "next dev" 2>/dev/null || true
pkill -f "nest start" 2>/dev/null || true

# Clean up log files
rm -f /tmp/webapp.log
rm -f /tmp/backend.log

echo "🎉 All services stopped!"
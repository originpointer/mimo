#!/bin/bash

# Start all apps in the turbo monorepo
# This script starts:
# - mimoserver (port 6006)
# - mimoim (port 3000)
# - docs (port 3001)
# - mimocrx (Chrome extension - runs in background)

set -e

TURBO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$TURBO_DIR"

echo "🚀 Starting all Mimo apps..."
echo ""

# Kill any existing processes on the ports first
echo "🧹 Cleaning up ports..."
./kill-ports.sh
echo ""

# Function to start an app in a new terminal window
start_in_terminal() {
    local app_name=$1
    local port=$2
    local app_dir=$3

    echo "▶️  Starting $app_name on port $port..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript > /dev/null <<EOF
tell application "Terminal"
    do script "cd \"$TURBO_DIR/$app_dir\" && pnpm dev"
    set custom title of front window to "$app_name ($port)"
end tell
EOF
    else
        # Linux - use gnome-terminal or xterm
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal --title="$app_name ($port)" -- bash -c "cd \"$TURBO_DIR/$app_dir\" && pnpm dev; exec bash"
        elif command -v xterm &> /dev/null; then
            xterm -title "$app_name ($port)" -e "cd \"$TURBO_DIR/$app_dir\" && pnpm dev" &
        else
            # Fallback: run in background with log
            echo "⚠️  No terminal emulator found, starting $app_name in background..."
            cd "$TURBO_DIR/$app_dir" && pnpm dev > "$TURBO_DIR/$app_name.log" 2>&1 &
        fi
    fi
}

# Start mimoserver first (backend)
start_in_terminal "mimoserver" "6006" "apps/mimoserver"
sleep 2

# Start mimoim (frontend)
start_in_terminal "mimoim" "3000" "apps/mimoim"
sleep 1

# Start docs (documentation)
start_in_terminal "docs" "3001" "apps/docs"
sleep 1

# Start mimocrx (Chrome extension - runs without port)
echo "▶️  Starting mimocrx (Chrome extension)..."
cd "$TURBO_DIR/apps/mimocrx"
pnpm dev > "$TURBO_DIR/mimocrx.log" 2>&1 &
MIMOCRX_PID=$!
echo "✓ mimocrx started (PID: $MIMOCRX_PID)"

# Wait a bit and show status
sleep 2

echo ""
echo "✅ All apps started!"
echo ""
echo "📍 URLs:"
echo "   • mimoim:        http://localhost:3000"
echo "   • docs:          http://localhost:3001"
echo "   • mimoserver:    http://localhost:6006"
echo "   • mimocrx:       See Chrome extensions"
echo ""
echo "📝 Logs:"
echo "   • mimocrx:       $TURBO_DIR/mimocrx.log"
echo ""
echo "🛑 To stop all apps, run: ./kill-ports.sh"
echo ""

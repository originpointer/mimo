#!/bin/bash

# Kill all processes using ports for apps under turbo/apps directory
# Ports:
# - 3000 (mimoim - Next.js)
# - 3001 (docs - Next.js, fallback port)
# - 6006 (mimoserver - Nitro HTTP + Socket.IO)

PORTS=(3000 3001 6006)

echo "Killing processes on ports: ${PORTS[*]}"

for PORT in "${PORTS[@]}"; do
    # Find process using the port
    PID=$(lsof -ti:$PORT)

    if [ -n "$PID" ]; then
        echo "Killing process on port $PORT (PID: $PID)"
        kill -9 $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✓ Successfully killed process on port $PORT"
        else
            echo "✗ Failed to kill process on port $PORT"
        fi
    else
        echo "No process found on port $PORT"
    fi
done

echo ""
echo "Done!"

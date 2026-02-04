#!/bin/bash

# Kill all processes using ports for apps under mimorepo/apps directory
# Ports:
# - 3000 (mimoim - Next.js)
# - 16005 (next-app)
# - 6006 (mimoserver - Nitro HTTP)
# - 6007 (mimoserver - BION Socket)
# - 16006 (nitro-app)

PORTS=(3000 16005 6006 6007 16006)

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

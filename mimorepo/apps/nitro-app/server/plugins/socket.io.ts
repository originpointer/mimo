import { defineNitroPlugin } from "nitropack/runtime"
import { Server as SocketIOServer } from "socket.io"
import { createServer } from "http"
import "../types/socket.d.ts"

// Socket.IO server instance
let io: SocketIOServer | null = null

export default defineNitroPlugin((nitroApp) => {
  // Check if already initialized
  if (io) {
    console.log('[Socket.IO] Already initialized')
    return
  }

  // Get the underlying Node.js server
  // Nitro doesn't expose the server directly in dev mode, so we need a different approach
  // For now, we'll attach Socket.IO to the nitro app context

  console.log('[Socket.IO] Plugin initializing...')

  // Store Socket.IO reference for later initialization
  ;(nitroApp as any)._socketIOConfig = {
    initialized: false,
    pendingConnections: [] as any[],
  }

  // Initialize Socket.IO when the server starts
  nitroApp.hooks.hook('render', () => {
    if (!(nitroApp as any)._socketIOConfig?.initialized) {
      try {
        // Try to get the underlying HTTP server
        const nodeServer = (nitroApp as any).nodeHandler?.server
        if (nodeServer) {
          io = new SocketIOServer(nodeServer, {
            cors: {
              origin: "*",
              methods: ["GET", "POST"]
            },
            path: "/socket.io/"
          })

          setupSocketIOHandlers(io)
          ;(nitroApp as any)._socketIOConfig.initialized = true
          ;(nitroApp as any).io = io

          console.log('[Socket.IO] Server initialized with HTTP server')
        } else {
          console.warn('[Socket.IO] No HTTP server available, Socket.IO not initialized')
        }
      } catch (error) {
        console.error('[Socket.IO] Initialization failed:', error)
      }
    }
  })

  // Alternative: Create a standalone Socket.IO server on a different port
  const initializeStandaloneServer = () => {
    const PORT = 6007 // Different from Nitro's port
    const httpServer = createServer()

    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: "/socket.io/"
    })

    setupSocketIOHandlers(io)

    httpServer.listen(PORT, () => {
      console.log(`[Socket.IO] Standalone server listening on port ${PORT}`)
      console.log(`[Socket.IO] Connect with: ws://localhost:${PORT}/socket.io/`)
    })

    ;(nitroApp as any).io = io
    ;(nitroApp as any)._socketIOConfig.initialized = true
  }

  // For development, use standalone server since Nitro dev doesn't expose server
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      if (!(nitroApp as any)._socketIOConfig?.initialized) {
        console.log('[Socket.IO] Initializing standalone server for development...')
        initializeStandaloneServer()
      }
    }, 1000)
  }
})

function setupSocketIOHandlers(io: SocketIOServer) {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`)

    // Handle Mimo commands
    socket.on('mimo.command', (data) => {
      console.log(`[Socket.IO] Mimo command received:`, data)

      // Emit response with correct event name (mimo.response, not mimo.response.${id})
      socket.emit('mimo.response', {
        id: data.id,
        success: true,
        data: { message: 'Command received' },
        timestamp: Date.now()
      })
    })

    // Handle Mimo stream start
    socket.on('mimo.stream.start', (data) => {
      console.log(`[Socket.IO] Mimo stream started:`, data)
    })

    // Handle room join
    socket.on('mimo.joinRoom', (room, callback) => {
      socket.join(room)
      console.log(`[Socket.IO] Client ${socket.id} joined room: ${room}`)
      if (callback) callback({ success: true, room })
    })

    // Handle room leave
    socket.on('mimo.leaveRoom', (room, callback) => {
      socket.leave(room)
      console.log(`[Socket.IO] Client ${socket.id} left room: ${room}`)
      if (callback) callback({ success: true, room })
    })

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`)
    })

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket.IO] Socket error for ${socket.id}:`, error)
    })

    // Send welcome message
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: Date.now()
    })
  })

  console.log('[Socket.IO] Event handlers configured')
}

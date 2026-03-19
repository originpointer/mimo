import { defineEventHandler, getHeader } from 'h3'
import { Server } from 'socket.io'
import { initializeFromHttpServer, getIO } from '../plugins/socket.io'
import { logger } from '../utils/logger'

// Global socket.io instance (fallback)
declare global {
  // eslint-disable-next-line no-var
  var __socketInitialized: boolean | undefined
}

export default defineEventHandler(async (event) => {
  // Initialize Socket.io on first request
  if (!globalThis.__socketInitialized) {
    const httpServer = event.node?.req?.socket?.server

    if (httpServer && !getIO()) {
      logger.info('[Socket.io Route] Initializing from HTTP server')
      initializeFromHttpServer(httpServer)
      globalThis.__socketInitialized = true
    }
  }

  // Return status
  return {
    status: 'ok',
    socketInitialized: !!getIO()
  }
})

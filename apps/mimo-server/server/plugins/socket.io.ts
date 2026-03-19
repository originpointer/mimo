import { Server } from 'socket.io'
import { logger } from '../utils/logger'
import { prisma } from '../utils/db'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Price
} from '@mimo/shared'

// Store latest price in memory for quick access
let latestPrice: Price | null = null

// Socket.io server instance
let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null

// Handle ECONNRESET errors at process level before anything else
// These are common with Socket.io when clients disconnect abruptly
const handleEconnreset = (err: Error & { code?: string }) => {
  if (err.code === 'ECONNRESET') {
    // Silently ignore ECONNRESET - this is normal when clients disconnect
    return
  }
  throw err
}

process.on('uncaughtException', handleEconnreset)

process.on('unhandledRejection', (reason: unknown) => {
  if (reason instanceof Error && (reason as any).code === 'ECONNRESET') {
    // Silently ignore ECONNRESET in promise rejections
    return
  }
  logger.error('[Socket.io] Unhandled rejection:', reason)
})

export default defineNitroPlugin((nitroApp) => {
  // Check if hooks are available
  if (!nitroApp.hooks) {
    logger.warn('[Socket.io] Hooks not available, skipping initialization')
    return
  }

  // Hook into 'close' for cleanup
  nitroApp.hooks.hook('close', () => {
    if (io) {
      io.close()
      logger.info('[Socket.io] Server closed')
    }
  })

  // Try to get the server from different sources
  const httpServer = (nitroApp as any).server?.httpServer ||
                     (nitroApp as any).httpServer ||
                     (nitroApp as any).listener

  if (httpServer) {
    logger.info('[Socket.io] Found HTTP server, initializing...')
    initializeSocketIO(httpServer)
  } else {
    logger.warn('[Socket.io] HTTP server not available in plugin context')
    logger.info('[Socket.io] Will initialize on first request via route handler')
  }
})

function initializeSocketIO(httpServer: any) {
  if (io) return // Already initialized

  try {
    // Handle HTTP server errors gracefully
    httpServer.on('error', (err: Error & { code?: string }) => {
      if (err.code === 'ECONNRESET') {
        return // Silently ignore
      }
      logger.error('[Socket.io] HTTP server error:', err)
    })

    io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      cors: {
        origin: ['http://localhost:3000', 'chrome-extension://*'],
        methods: ['GET', 'POST']
      },
      path: '/socket.io/',
      transports: ['polling', 'websocket'],
      pingTimeout: 60000,
      pingInterval: 25000
    })

    io.on('connection', (socket) => {
      logger.info(`[Socket.io] Client connected: ${socket.id}`)

      // Send latest price to newly connected client
      if (latestPrice) {
        socket.emit('price:realtime', latestPrice)
      }

      // Handle price updates from browser extension
      socket.on('price:update', async (data: Price) => {
        logger.info(`[Socket.io] Price update received: ${data.value} from ${data.source}`)
        latestPrice = data

        // Save to database
        try {
          await prisma.price.create({
            data: {
              value: data.value,
              currency: data.currency,
              timestamp: BigInt(data.timestamp),
              source: data.source
            }
          })
          logger.info(`[Socket.io] Price saved to database: ${data.value}`)
        } catch (error) {
          logger.error('[Socket.io] Failed to save price to database:', error)
        }

        io?.emit('price:realtime', data)
      })

      // Handle alert subscription
      socket.on('alert:subscribe', (alertId: string) => {
        logger.info(`[Socket.io] Client ${socket.id} subscribed to alert: ${alertId}`)
        socket.join(`alert:${alertId}`)
      })

      // Handle alert unsubscription
      socket.on('alert:unsubscribe', (alertId: string) => {
        logger.info(`[Socket.io] Client ${socket.id} unsubscribed from alert: ${alertId}`)
        socket.leave(`alert:${alertId}`)
      })

      socket.on('disconnect', () => {
        logger.info(`[Socket.io] Client disconnected: ${socket.id}`)
      })
    })

    globalThis.__io = io
    logger.info('[Socket.io] Server initialized successfully')
  } catch (error) {
    logger.error('[Socket.io] Failed to initialize:', error)
  }
}

// Export type for global io instance
declare global {
  // eslint-disable-next-line no-var
  var __io: Server<ClientToServerEvents, ServerToClientEvents> | undefined
}

// Export function to get io instance
export function getIO() {
  return globalThis.__io
}

// Export function to get latest price
export function getLatestPrice() {
  return latestPrice
}

// Export function to set latest price
export function setLatestPrice(price: Price) {
  latestPrice = price
}

// Export function to manually initialize (used by route handler)
export function initializeFromHttpServer(httpServer: any) {
  initializeSocketIO(httpServer)
}

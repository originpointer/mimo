/**
 * MimoBus Plugin - Socket.IO Server for Browser Client Communication
 *
 * This plugin initializes the MimoBus Socket.IO server that receives
 * connections from browser extensions and pages.
 *
 * REFACTORED ARCHITECTURE:
 *   Nitro Server → MimoBus Server → Socket.IO → Browser Extension
 */

import { defineNitroPlugin } from "nitropack/runtime"
import { MimoBus } from "@mimo/bus"
import "../types/socket.d.ts"

// Infer BrowserClient type from MimoBus methods
type BrowserClient = ReturnType<MimoBus['getClients']>[number]

// MimoBus instance
let mimoBus: MimoBus | null = null

export default defineNitroPlugin((nitroApp) => {
  // Check if already initialized
  if (mimoBus) {
    console.log('[MimoBus] Already initialized')
    return
  }

  console.log('[MimoBus] Plugin initializing...')

  // Store MimoBus reference for later initialization
  ;(nitroApp as any)._mimoBusConfig = {
    initialized: false,
  }

  // Create MimoBus instance (Socket.IO server)
  mimoBus = new MimoBus({
    port: 6007,
    debug: process.env.NODE_ENV === 'development',
    logLevel: 'debug', // Enable debug level logging for heartbeats
  })

  // Graceful shutdown handler
  const closeServers = async () => {
    console.log('[MimoBus] Closing server...')
    if (mimoBus) {
      mimoBus.destroy()
      mimoBus = null
      console.log('[MimoBus] Server closed')
    }
  }

  // Register shutdown hook
  nitroApp.hooks.hook('close', async () => {
    await closeServers()
  })

  // Also handle process termination signals for dev mode
  if (process.env.NODE_ENV === 'development') {
    const shutdown = async (signal: string) => {
      console.log(`[MimoBus] Received ${signal}, shutting down gracefully...`)
      await closeServers()
      process.exit(0)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  }

  // Initialize the server
  const initializeServer = async () => {
    try {
      await mimoBus!.connect()
      ;(nitroApp as any)._mimoBusConfig.initialized = true

      console.log('[MimoBus] Server initialized')
      console.log('[MimoBus] Listening on port 6007')
      console.log('[MimoBus] Browser extensions can connect to: ws://localhost:6007/socket.io/')
      console.log('[MimoBus] Namespace: /mimo')

      // Store MimoBus reference for access from other parts of the app
      ;(global as any).__mimoBus = mimoBus

      // Log connection status changes
      mimoBus!.on('connected', () => {
        console.log('[MimoBus] Server started')
      })

      mimoBus!.on('disconnected', () => {
        console.log('[MimoBus] Server stopped')
      })

      mimoBus!.on('commandSent', ({ command }) => {
        console.log('[MimoBus] Command sent:', {
          id: command.id,
          type: command.type,
        })
      })

      mimoBus!.on('commandResult', ({ id, response }) => {
        console.log('[MimoBus] Command result:', {
          id,
          success: response.success,
          duration: response.duration,
        })
      })

      // Log client connections
      setInterval(() => {
        const clientCount = mimoBus!.getClientCount()
        if (clientCount > 0) {
          const clients = mimoBus!.getClients()
          console.log('[MimoBus] Active clients:', {
            count: clientCount,
            clients: clients.map((c) => ({
              socketId: c.socketId,
              clientType: c.clientType,
              tabId: c.tabId,
            })),
          })
        }
      }, 30000) // Log every 30 seconds

    } catch (error) {
      console.error('[MimoBus] Initialization failed:', error)
      throw error
    }
  }

  // For development, initialize server
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      if (!(nitroApp as any)._mimoBusConfig?.initialized) {
        console.log('[MimoBus] Initializing server for development...')
        initializeServer()
      }
    }, 1000)
  }
})

import { defineNitroPlugin } from "nitropack/runtime"
import { defineEventHandler } from "h3"
import "../types/socket.d.ts"

// Simple Socket.IO-like interface for WebSocket support
interface PeerLike {
  send(data: string): void
  close(): void
  readyState: number
}

interface SocketLike {
  id: string
  emit(event: string, data: unknown): void
  on(event: string, handler: (...args: any[]) => void): void
  join(room: string): void
  leave(room: string): void
  rooms: Set<string>
}

// Store socket data by peer reference (using Map with peer as key)
const peerToSocketId = new Map<PeerLike, string>()
const socketIdToPeer = new Map<string, PeerLike>()
const messageHandlers = new Map<string, Map<string, Set<(data: unknown) => void>>>() // socketId -> event -> handlers

// Room management
const rooms = new Map<string, Set<string>>()
const socketRooms = new Map<string, Set<string>>()

export default defineNitroPlugin((nitroApp) => {
  // Check if already initialized
  if (nitroApp.io) return

  // Broadcast helper
  const broadcast = (event: string, data: unknown, targetRoom?: string) => {
    const message = JSON.stringify({ event, data })
    for (const [id, peer] of socketIdToPeer) {
      if (peer.readyState === 1) { // OPEN
        if (targetRoom) {
          const clientRooms = socketRooms.get(id) || new Set()
          if (clientRooms.has(targetRoom)) {
            peer.send(message)
          }
        } else {
          peer.send(message)
        }
      }
    }
  }

  // Create Socket.IO-like interface
  const io = {
    emit(event: string, data: unknown) {
      broadcast(event, data)
    },
    to(room: string) {
      return {
        emit(event: string, data: unknown) {
          broadcast(event, data, room)
        }
      }
    },
    on(event: string, handler: (...args: any[]) => void) {
      if (event === "connection") {
        ;(io as any)._connectionHandler = handler
      }
    },
    close() {
      for (const peer of socketIdToPeer.values()) {
        peer.close()
      }
      peerToSocketId.clear()
      socketIdToPeer.clear()
    }
  } as any

  // Attach to nitroApp using proper types
  nitroApp.io = io

  // Handle WebSocket connections
  nitroApp.router.use("/socket.io/", defineEventHandler({
    handler() {
      // HTTP handler - return upgrade hint for WebSocket
    },
    websocket: {
      open(peer) {
        const ws = peer as unknown as PeerLike

        // Generate socket ID
        const socketId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

        // Store mappings
        peerToSocketId.set(ws, socketId)
        socketIdToPeer.set(socketId, ws)
        socketRooms.set(socketId, new Set())
        messageHandlers.set(socketId, new Map())

        // Create socket-like object
        const socket: SocketLike = {
          id: socketId,
          emit(event: string, data: unknown) {
            if (ws.readyState === 1) {
              ws.send(JSON.stringify({ event, data }))
            }
          },
          on(event: string, handler: (...args: any[]) => void) {
            const handlers = messageHandlers.get(socketId)
            if (handlers) {
              let eventHandlers = handlers.get(event)
              if (!eventHandlers) {
                eventHandlers = new Set()
                handlers.set(event, eventHandlers)
              }
              eventHandlers.add(handler as any)
            }
          },
          join(room: string) {
            const clientRooms = socketRooms.get(socketId) || new Set()
            clientRooms.add(room)
            socketRooms.set(socketId, clientRooms)

            const roomClients = rooms.get(room) || new Set()
            roomClients.add(socketId)
            rooms.set(room, roomClients)
          },
          leave(room: string) {
            const clientRooms = socketRooms.get(socketId)
            if (clientRooms) {
              clientRooms.delete(room)
              const roomClients = rooms.get(room)
              if (roomClients) {
                roomClients.delete(socketId)
              }
            }
          },
          rooms: new Set()
        }

        // Call connection handler
        const connectionHandler = (io as any)._connectionHandler
        if (connectionHandler) {
          connectionHandler(socket)
        }

        console.log(`[Socket.IO] Client connected: ${socketId}`)
      },
      message(peer, message) {
        const ws = peer as unknown as PeerLike
        const socketId = peerToSocketId.get(ws)

        if (!socketId) return

        try {
          const data = message.toString()
          const { event, payload } = JSON.parse(data)

          // Create a temporary socket object for emitting responses
          const socket: SocketLike = {
            id: socketId,
            emit(evt: string, data: unknown) {
              if (ws.readyState === 1) {
                ws.send(JSON.stringify({ event: evt, data }))
              }
            },
            on() {},
            join(room: string) {
              const clientRooms = socketRooms.get(socketId) || new Set()
              clientRooms.add(room)
              socketRooms.set(socketId, clientRooms)

              const roomClients = rooms.get(room) || new Set()
              roomClients.add(socketId)
              rooms.set(room, roomClients)
            },
            leave(room: string) {
              const clientRooms = socketRooms.get(socketId)
              if (clientRooms) {
                clientRooms.delete(room)
                const roomClients = rooms.get(room)
                if (roomClients) {
                  roomClients.delete(socketId)
                }
              }
            },
            rooms: new Set()
          }

          // Handle special events
          if (event === "message") {
            const handlers = messageHandlers.get(socketId)?.get("message") || new Set()
            for (const handler of handlers) {
              handler(payload)
            }
            socket.emit("message-ack", { received: true, timestamp: Date.now() })
          } else if (event === "join-room") {
            socket.join(payload)
            socket.emit("room-joined", { roomId: payload, socketId })
          }
        } catch {
          // Ignore parse errors
        }
      },
      close(peer) {
        const ws = peer as unknown as PeerLike
        const socketId = peerToSocketId.get(ws)

        if (socketId) {
          console.log(`[Socket.IO] Client disconnected: ${socketId}`)

          // Clean up rooms
          const clientRooms = socketRooms.get(socketId) || new Set()
          for (const room of clientRooms) {
            const roomClients = rooms.get(room)
            if (roomClients) {
              roomClients.delete(socketId)
            }
          }
          socketRooms.delete(socketId)
          messageHandlers.delete(socketId)
          peerToSocketId.delete(ws)
          socketIdToPeer.delete(socketId)
        }
      }
    }
  }))

  console.log("[Socket.IO] Plugin initialized successfully (WebSocket mode)")
})

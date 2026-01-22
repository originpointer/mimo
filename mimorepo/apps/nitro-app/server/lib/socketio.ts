import { useNitroApp } from "nitropack/runtime"
import type { Server as SocketIOServer } from "socket.io"

export function getSocketIOServer(): SocketIOServer {
  const nitroApp = useNitroApp()
  const io = (nitroApp as any).io
  if (!io) throw new Error("Socket.IO server not initialized")
  return io
}

export function broadcastToAll(event: string, data: unknown): void {
  getSocketIOServer().emit(event, data)
}

export function broadcastToRoom(room: string, event: string, data: unknown): void {
  getSocketIOServer().to(room).emit(event, data)
}

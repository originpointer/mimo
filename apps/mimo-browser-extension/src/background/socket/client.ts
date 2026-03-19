import { io, Socket } from 'socket.io-client'
import type { Price } from '@mimo/shared'
import { useConnectionStore } from '../stores/connection.store'

const SERVER_URL = 'http://localhost:3001'

let socket: Socket | null = null
let pendingQueue: Price[] = []

/**
 * 建立 Socket.io 长连接
 */
export function initSocket(): Socket {
  if (socket) return socket

  const connectionStore = useConnectionStore.getState()

  socket = io(SERVER_URL, {
    path: '/socket.io',
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  // 连接成功
  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id)
    connectionStore.setConnected(socket?.id || '')

    // 发送队列中的数据
    flushQueue()
  })

  // 断开连接
  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
    connectionStore.setDisconnected()
  })

  // 重连中
  socket.on('reconnecting', (attempt) => {
    console.log('[Socket] Reconnecting:', attempt)
    connectionStore.setReconnecting()
  })

  return socket
}

/**
 * 上传价格数据
 */
export function uploadPrice(data: Record<string, unknown>): void {
  const price: Price = {
    id: crypto.randomUUID(),
    value: data.price as number,
    currency: 'USD',
    timestamp: Date.now(),
    source: 'investing.com'
  }

  if (!socket?.connected) {
    // 断线时加入队列
    pendingQueue.push(price)
    console.warn('[Socket] Not connected, queued price')
    return
  }

  socket.emit('price:update', price)
}

/**
 * 发送队列中的数据
 */
function flushQueue(): void {
  if (pendingQueue.length === 0) return

  console.log('[Socket] Flushing queue:', pendingQueue.length)

  for (const price of pendingQueue) {
    socket?.emit('price:update', price)
  }

  pendingQueue = []
}

export function getSocket(): Socket | null {
  return socket
}

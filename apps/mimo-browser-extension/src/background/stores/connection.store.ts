import { create } from 'zustand'

interface ConnectionState {
  status: 'connected' | 'disconnected' | 'reconnecting'
  socketId: string | null
  lastConnected: number | null
  reconnectCount: number

  setConnected: (socketId: string) => void
  setDisconnected: () => void
  setReconnecting: () => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  socketId: null,
  lastConnected: null,
  reconnectCount: 0,

  setConnected: (socketId) => set({
    status: 'connected',
    socketId,
    lastConnected: Date.now(),
    reconnectCount: 0
  }),
  setDisconnected: () => set({
    status: 'disconnected',
    socketId: null
  }),
  setReconnecting: () => set((s) => ({
    status: 'reconnecting',
    reconnectCount: s.reconnectCount + 1
  }))
}))

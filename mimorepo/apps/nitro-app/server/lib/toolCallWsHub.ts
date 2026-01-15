import type { WebSocketPeer } from "h3"
import { useNitroApp } from "nitropack/runtime"

export type ToolCallWsMessage = {
  type: "tool-call:result"
  taskId: string
  toolType: string
  ok: boolean
  dataUrl?: string
  meta?: unknown
  error?: string
}

export type ToolCallWsHub = {
  addPeer: (peer: WebSocketPeer) => void
  removePeer: (peer: WebSocketPeer) => void
  broadcast: (payload: ToolCallWsMessage) => void
}

export function createToolCallWsHub(): ToolCallWsHub {
  const peers = new Set<WebSocketPeer>()

  return {
    addPeer(peer) {
      peers.add(peer)
    },
    removePeer(peer) {
      peers.delete(peer)
    },
    broadcast(payload) {
      const message = JSON.stringify(payload)
      for (const peer of peers) {
        try {
          peer.send(message)
        } catch {
          // ignore broken peers
        }
      }
    }
  }
}

export function getToolCallWsHub(): ToolCallWsHub {
  const nitroApp = useNitroApp()
  const hub = (nitroApp as any).toolCallWsHub as ToolCallWsHub | undefined
  if (!hub) {
    throw new Error("toolCallWsHub not initialized")
  }
  return hub
}

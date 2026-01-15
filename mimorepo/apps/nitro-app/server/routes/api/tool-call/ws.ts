import { defineWebSocketHandler } from "h3"

import { getToolCallWsHub } from "@/lib/toolCallWsHub"

export default defineWebSocketHandler({
  open(peer) {
    getToolCallWsHub().addPeer(peer)
  },
  close(peer) {
    getToolCallWsHub().removePeer(peer)
  }
})

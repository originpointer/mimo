import { defineNitroPlugin } from "nitropack/runtime"

import { createToolCallWsHub } from "@/lib/toolCallWsHub"

export default defineNitroPlugin((nitroApp) => {
  if (!(nitroApp as any).toolCallWsHub) {
    ;(nitroApp as any).toolCallWsHub = createToolCallWsHub()
  }
})

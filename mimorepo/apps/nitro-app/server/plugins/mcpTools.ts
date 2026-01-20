import { defineNitroPlugin } from "nitropack/runtime"

import { createMcpRegistry } from "@/lib/mcp/registry"
import { mcpGlobFilesTool } from "@/lib/mcp/tools/globFiles"
import { mcpGrepFilesTool } from "@/lib/mcp/tools/grepFiles"
import { mcpListTreeTool } from "@/lib/mcp/tools/listTree"
import { mcpReadTextTool } from "@/lib/mcp/tools/readText"
import type { McpContext, McpRegistry } from "@/lib/mcp/types"

export default defineNitroPlugin((nitroApp) => {
  // NOTE: internal-only MCP registry. Do NOT expose as public transport without auth/rate-limit.
  if (!(nitroApp as any).mcpRegistry) {
    const registry = createMcpRegistry()
    registry.register(mcpReadTextTool)
    registry.register(mcpListTreeTool)
    registry.register(mcpGlobFilesTool)
    registry.register(mcpGrepFilesTool)
    ;(nitroApp as any).mcpRegistry = registry
  }

  nitroApp.hooks.hook("request", (event) => {
    const registry = (nitroApp as any).mcpRegistry as McpRegistry
    const mcp: McpContext = {
      listTools: () => registry.listTools(),
      callTool: (name, args) => registry.callTool(name, args, { event }),
    }
    ;(event.context as any).mcp = mcp
  })
})


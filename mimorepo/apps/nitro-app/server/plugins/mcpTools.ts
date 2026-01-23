import { defineNitroPlugin } from "nitropack/runtime"

import { createMcpRegistry } from "@/lib/mcp/registry"
import { mcpGlobFilesTool } from "@/lib/mcp/tools/globFiles"
import { mcpGrepFilesTool } from "@/lib/mcp/tools/grepFiles"
import { mcpListTreeTool } from "@/lib/mcp/tools/listTree"
import { mcpReadTextTool } from "@/lib/mcp/tools/readText"
// Mimo tools
import { mimoTools } from "@/lib/mimo/tools"
import type { McpContext, McpRegistry } from "@/lib/mcp/types"

export default defineNitroPlugin((nitroApp) => {
  // NOTE: internal-only MCP registry. Do NOT expose as public transport without auth/rate-limit.
  if (!(nitroApp as any).mcpRegistry) {
    const registry = createMcpRegistry()
    // Register file tools
    registry.register(mcpReadTextTool)
    registry.register(mcpListTreeTool)
    registry.register(mcpGlobFilesTool)
    registry.register(mcpGrepFilesTool)
    // Register Mimo tools
    for (const tool of mimoTools) {
      registry.register(tool)
    }
    ;(nitroApp as any).mcpRegistry = registry

    console.log('[MCP] Registered tools:', registry.listTools().map((t) => t.name).join(', '))
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


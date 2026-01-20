import z from "zod"

import type { McpRegistry, McpTool, McpToolContext, McpToolInfo } from "@/lib/mcp/types"

export function createMcpRegistry(): McpRegistry {
  const tools = new Map<string, McpTool>()

  const register = (tool: McpTool) => {
    const name = String(tool?.name || "").trim()
    if (!name) throw new Error("MCP tool name is required")
    if (tools.has(name)) throw new Error(`MCP tool already registered: ${name}`)
    tools.set(name, tool)
  }

  const listTools = (): McpToolInfo[] => {
    return Array.from(tools.values())
      .map((t) => ({ name: t.name, description: t.description }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const callTool = async (name: string, args: unknown, ctx: McpToolContext) => {
    const tool = tools.get(name)
    if (!tool) {
      throw new Error(`Unknown MCP tool: ${name}`)
    }

    let parsed: any
    try {
      parsed = tool.inputSchema.parse(args)
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const details = e.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")
        throw new Error(`Invalid arguments for tool ${name}: ${details}`)
      }
      throw e
    }

    return await tool.handler(parsed, ctx)
  }

  return { register, listTools, callTool }
}


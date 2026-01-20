import type { McpContext } from "@/lib/mcp/types"

declare module "h3" {
  interface H3EventContext {
    mcp?: McpContext
  }
}

export {}


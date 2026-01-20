import type { H3Event } from "h3"
import type OpenAI from "openai"
import type { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js"
import type { ZodTypeAny } from "zod"

// Align with MCP SDK official content types
export type McpTextContent = TextContent

// Align with MCP SDK result shape, but keep internal extensions.
export type McpCallResult = CallToolResult & {
  title?: string
  meta?: Record<string, any>
}

// OpenAI v6 type aliases (for future tool-calling integration)
export type OpenAIClient = OpenAI
export type OpenAIChatCompletion = OpenAI.Chat.ChatCompletion
export type OpenAIChatCompletionCreateParams = OpenAI.Chat.ChatCompletionCreateParams
export type OpenAIChatCompletionMessageParam = OpenAI.Chat.ChatCompletionMessageParam

export type McpToolContext = {
  event: H3Event
}

export type McpTool = {
  name: string
  description: string
  inputSchema: ZodTypeAny
  handler: (args: any, ctx: McpToolContext) => Promise<McpCallResult>
}

export type McpToolInfo = {
  name: string
  description: string
}

export type McpRegistry = {
  register: (tool: McpTool) => void
  listTools: () => McpToolInfo[]
  callTool: (name: string, args: unknown, ctx: McpToolContext) => Promise<McpCallResult>
}

export type McpContext = {
  listTools: () => McpToolInfo[]
  callTool: (name: string, args: unknown) => Promise<McpCallResult>
}


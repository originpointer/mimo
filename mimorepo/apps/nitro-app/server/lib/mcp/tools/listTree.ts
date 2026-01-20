import { ListTreeInputSchema, listUploadsTree } from "@/lib/tools/listTree"
import type { McpTool } from "@/lib/mcp/types"

export const mcpListTreeTool: McpTool = {
  name: "listTree",
  description: "List a directory tree under Nitro uploads (limited).",
  inputSchema: ListTreeInputSchema,
  async handler(args, ctx) {
    const result = await listUploadsTree(args)
    return {
      title: result.title,
      content: [{ type: "text", text: result.output }],
      meta: {
        ...result.metadata,
        tool: "listTree",
      },
    }
  },
}


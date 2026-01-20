import { GrepFilesInputSchema, grepFilesInUploads } from "@/lib/tools/grepFiles"
import type { McpTool } from "@/lib/mcp/types"

export const mcpGrepFilesTool: McpTool = {
  name: "grepFiles",
  description: "Search file contents in Nitro uploads using JS RegExp (line-based).",
  inputSchema: GrepFilesInputSchema,
  async handler(args, ctx) {
    const result = await grepFilesInUploads(args)
    return {
      title: result.title,
      content: [{ type: "text", text: result.output }],
      meta: {
        ...result.metadata,
        tool: "grepFiles",
      },
    }
  },
}


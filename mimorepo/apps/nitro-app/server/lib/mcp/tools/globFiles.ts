import { GlobFilesInputSchema, globFilesInUploads } from "@/lib/tools/globFiles"
import type { McpTool } from "@/lib/mcp/types"

export const mcpGlobFilesTool: McpTool = {
  name: "globFiles",
  description: "Find files in Nitro uploads using a simplified glob (sorted by mtime).",
  inputSchema: GlobFilesInputSchema,
  async handler(args, ctx) {
    const result = await globFilesInUploads(args)
    return {
      title: result.title,
      content: [{ type: "text", text: result.output }],
      meta: {
        ...result.metadata,
        tool: "globFiles",
      },
    }
  },
}


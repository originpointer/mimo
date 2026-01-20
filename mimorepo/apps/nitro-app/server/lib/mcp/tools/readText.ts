import { ReadTextInputSchema, readTextInUploads } from "@/lib/tools/readText"
import type { McpTool } from "@/lib/mcp/types"

export const mcpReadTextTool: McpTool = {
  name: "readText",
  description: "Read a text file from Nitro uploads (line-numbered, truncated).",
  inputSchema: ReadTextInputSchema,
  async handler(args, ctx) {
    const result = await readTextInUploads(args)
    return {
      title: result.title,
      content: [{ type: "text", text: result.output }],
      meta: {
        ...result.metadata,
        tool: "readText",
      },
    }
  },
}


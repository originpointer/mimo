/**
 * Mimo MCP Tool: navigate
 *
 * Navigate browser to a specified URL
 */

import { z } from 'zod'
import type { McpTool } from '@/lib/mcp/types'
import { getMimoInstance } from '../instance'

const NavigateInputSchema = z.object({
  url: z.string().url().describe('The URL to navigate to (e.g., https://example.com)'),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('load').describe('When to consider navigation succeeded'),
  tabId: z.string().optional().describe('Target tab ID (optional, uses default tab if not specified)'),
})

export const mimoNavigateTool: McpTool = {
  name: 'mimo_navigate',
  description: 'Navigate the browser to a specified URL. Supports waiting for different load states. Requires browser extension to be connected.',
  inputSchema: NavigateInputSchema,
  handler: async (args, ctx) => {
    const mimo = await getMimoInstance()

    const result = await mimo.navigate(args.url, {
      waitUntil: args.waitUntil,
      tabId: args.tabId,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: result.success,
              message: result.message,
              url: result.url,
            },
            null,
            2
          ),
        },
      ],
    }
  },
}

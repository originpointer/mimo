/**
 * Mimo MCP Tool: act
 *
 * Execute browser action using natural language
 */

import { z } from 'zod'
import type { McpTool } from '@/lib/mcp/types'
import { getMimoInstance } from '../instance'

const ActInputSchema = z.object({
  instruction: z.string().describe('Natural language instruction for browser action (e.g., "点击登录按钮")'),
  variables: z.record(z.string()).optional().describe('Template variables for instruction'),
  tabId: z.string().optional().describe('Target tab ID (optional, uses default tab if not specified)'),
})

export const mimoActTool: McpTool = {
  name: 'mimo_act',
  description: 'Execute browser action using natural language. Requires browser extension to be connected.',
  inputSchema: ActInputSchema,
  handler: async (args, ctx) => {
    const mimo = await getMimoInstance()

    const result = await mimo.act(args.instruction, {
      variables: args.variables,
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
              actionDescription: result.actionDescription,
              actions: result.actions,
            },
            null,
            2
          ),
        },
      ],
    }
  },
}

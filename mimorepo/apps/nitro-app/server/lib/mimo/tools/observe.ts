/**
 * Mimo MCP Tool: observe
 *
 * Observe available actions on current page
 */

import { z } from 'zod'
import type { McpTool } from '@/lib/mcp/types'
import { getMimoInstance } from '../instance'

const ObserveInputSchema = z.object({
  context: z.string().optional().describe('Observation context to help understand what to look for'),
  selector: z.string().optional().describe('CSS selector to limit observation area (optional)'),
  tabId: z.string().optional().describe('Target tab ID (optional, uses default tab if not specified)'),
})

export const mimoObserveTool: McpTool = {
  name: 'mimo_observe',
  description: 'Observe available actions on current page. Returns a list of actionable elements with their selectors. Requires browser extension to be connected.',
  inputSchema: ObserveInputSchema,
  handler: async (args, ctx) => {
    const mimo = await getMimoInstance()

    const actions = await mimo.observe(args.context, {
      selector: args.selector,
      tabId: args.tabId,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: actions.length,
              actions: actions,
            },
            null,
            2
          ),
        },
      ],
    }
  },
}

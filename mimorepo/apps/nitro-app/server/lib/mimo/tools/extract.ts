/**
 * Mimo MCP Tool: extract
 *
 * Extract structured data from web page
 */

import { z } from 'zod'
import type { McpTool } from '@/lib/mcp/types'
import { getMimoInstance } from '../instance'

const ExtractInputSchema = z.object({
  instruction: z.string().describe('Data extraction instruction (e.g., "获取商品价格")'),
  schema: z.string().optional().describe('Zod schema definition for structured output (optional)'),
  selector: z.string().optional().describe('CSS selector to limit extraction area (optional)'),
  tabId: z.string().optional().describe('Target tab ID (optional, uses default tab if not specified)'),
})

export const mimoExtractTool: McpTool = {
  name: 'mimo_extract',
  description: 'Extract structured data from web page using natural language. Requires browser extension to be connected.',
  inputSchema: ExtractInputSchema,
  handler: async (args, ctx) => {
    const mimo = await getMimoInstance()

    // Parse schema if provided (basic support for simple schemas)
    let zodSchema: any
    if (args.schema) {
      try {
        // For now, schema parsing is optional - we can add Zod schema parsing later
        // The extract method works fine without a schema for simple extractions
        zodSchema = undefined
      } catch (e) {
        console.warn('[Mimo] Failed to parse schema, proceeding without schema:', e)
      }
    }

    const result = await mimo.extract(args.instruction, zodSchema, {
      selector: args.selector,
      tabId: args.tabId,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              extraction: result.extraction,
              success: result.success,
              message: result.message,
            },
            null,
            2
          ),
        },
      ],
    }
  },
}

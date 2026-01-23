/**
 * Mimo MCP Tool: agent
 *
 * Execute multi-step automation task using AI agent
 */

import { z } from 'zod'
import type { McpTool } from '@/lib/mcp/types'
import { getMimoInstance } from '../instance'

const AgentInputSchema = z.object({
  instruction: z.string().describe('Task instruction for the agent (e.g., "在京东搜索 iPhone 15 并加入购物车")'),
  maxSteps: z.number().optional().default(25).describe('Maximum steps to execute'),
  model: z.string().optional().describe('Model to use (e.g., openai/gpt-4o-mini, defaults to configured model)'),
  systemPrompt: z.string().optional().describe('Custom system prompt for the agent (optional)'),
})

export const mimoAgentTool: McpTool = {
  name: 'mimo_agent',
  description: 'Execute multi-step automation task using AI agent. The agent will observe the page, plan actions, and execute them until the task is complete or max steps is reached. Requires browser extension to be connected.',
  inputSchema: AgentInputSchema,
  handler: async (args, ctx) => {
    const mimo = await getMimoInstance()

    // Create agent with configuration
    let agent = mimo.agent({
      maxSteps: args.maxSteps,
    })

    // Apply optional configurations
    if (args.model) {
      agent = agent.withModel(args.model)
    }

    if (args.systemPrompt) {
      agent = agent.withSystemPrompt(args.systemPrompt)
    }

    // Execute the task
    const result = await agent.execute({
      instruction: args.instruction,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: result.success,
              completed: result.completed,
              message: result.message,
              stepCount: result.actions.length,
              actions: result.actions.map((a) => ({
                action: a.action,
                reasoning: a.reasoning,
                completed: a.completed,
              })),
              usage: result.usage,
            },
            null,
            2
          ),
        },
      ],
    }
  },
}

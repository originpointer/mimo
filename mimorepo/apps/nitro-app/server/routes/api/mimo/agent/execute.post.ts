/**
 * Mimo API Route: agent/execute
 *
 * Execute multi-step automation task using AI agent (non-streaming)
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getMimoInstance } from '@/lib/mimo/instance'

export default defineEventHandler(async (event) => {
  try {
    const { instruction, config } = await readBody(event)

    if (!instruction || typeof instruction !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Missing or invalid "instruction" parameter',
      })
    }

    const mimo = await getMimoInstance()
    const agent = mimo.agent(config)

    const result = await agent.execute({ instruction })

    return {
      success: true,
      data: {
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
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to execute agent',
      data: { code: error.code, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
    })
  }
})

/**
 * Mimo API Route: agent/stream
 *
 * Execute multi-step automation task using AI agent with streaming
 */

import { defineEventHandler, readBody, setResponseHeader, setResponseStatus, createError } from 'h3'
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

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const streamEvent of await agent.streamExecute({ instruction })) {
            const data = JSON.stringify(streamEvent)
            controller.enqueue(`data: ${data}\n\n`)
          }
        } catch (error: any) {
          const errorData = JSON.stringify({
            type: 'error',
            data: { error: error.message, code: error.code },
          })
          controller.enqueue(`data: ${errorData}\n\n`)
        } finally {
          controller.close()
        }
      },
    })

    setResponseHeader(event, 'content-type', 'text/event-stream')
    setResponseHeader(event, 'cache-control', 'no-cache')
    setResponseHeader(event, 'connection', 'keep-alive')
    setResponseHeader(event, 'x-accel-buffering', 'no') // Disable nginx buffering
    setResponseStatus(event, 200)

    return stream
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to execute agent',
      data: { code: error.code, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
    })
  }
})

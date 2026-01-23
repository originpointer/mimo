/**
 * Mimo API Route: act
 *
 * Execute browser action using natural language
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getMimoInstance } from '@/lib/mimo/instance'

export default defineEventHandler(async (event) => {
  try {
    const { input, options } = await readBody(event)

    if (!input || typeof input !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Missing or invalid "input" parameter',
      })
    }

    const mimo = await getMimoInstance()
    const result = await mimo.act(input, options)

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to execute act',
      data: { code: error.code, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
    })
  }
})

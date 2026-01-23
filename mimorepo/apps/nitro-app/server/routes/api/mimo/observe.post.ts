/**
 * Mimo API Route: observe
 *
 * Observe available actions on current page
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getMimoInstance } from '@/lib/mimo/instance'

export default defineEventHandler(async (event) => {
  try {
    const { instruction, options } = await readBody(event)

    const mimo = await getMimoInstance()
    const actions = await mimo.observe(instruction, options)

    return {
      success: true,
      data: {
        count: actions.length,
        actions,
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to observe page',
      data: { code: error.code, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
    })
  }
})

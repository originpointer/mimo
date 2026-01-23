/**
 * Mimo API Route: extract
 *
 * Extract structured data from web page
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getMimoInstance } from '@/lib/mimo/instance'

export default defineEventHandler(async (event) => {
  try {
    const { instruction, schema, options } = await readBody(event)

    if (!instruction || typeof instruction !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Missing or invalid "instruction" parameter',
      })
    }

    const mimo = await getMimoInstance()
    const result = await mimo.extract(instruction, schema, options)

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to extract data',
      data: { code: error.code, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
    })
  }
})

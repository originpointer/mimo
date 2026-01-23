/**
 * Mimo API Route: navigate
 *
 * Navigate browser to a specified URL
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getMimoInstance } from '@/lib/mimo/instance'

export default defineEventHandler(async (event) => {
  try {
    const { url, options } = await readBody(event)

    if (!url || typeof url !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Missing or invalid "url" parameter',
      })
    }

    const mimo = await getMimoInstance()

    console.log('[Navigate API] Calling navigate with:', { url, options })

    const result = await mimo.navigate(url, options)

    console.log('[Navigate API] Navigate result:', result)

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to navigate',
      data: { code: error.code, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
    })
  }
})

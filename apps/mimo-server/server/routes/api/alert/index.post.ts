import { defineEventHandler, readBody } from 'h3'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || typeof body.targetPrice !== 'number' || !body.type) {
    return {
      success: false,
      error: 'Invalid request body. Required: targetPrice (number), type (above|below)'
    }
  }

  if (body.type !== 'above' && body.type !== 'below') {
    return {
      success: false,
      error: 'type must be "above" or "below"'
    }
  }

  const alert = await prisma.priceAlert.create({
    data: {
      type: body.type,
      targetPrice: body.targetPrice,
      enabled: true
    }
  })

  return {
    success: true,
    data: {
      id: alert.id,
      type: alert.type,
      targetPrice: alert.targetPrice,
      enabled: alert.enabled,
      createdAt: alert.createdAt.getTime()
    }
  }
})

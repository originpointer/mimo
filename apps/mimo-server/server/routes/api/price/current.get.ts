import { defineEventHandler } from 'h3'
import { prisma } from '../../../utils/db'
import type { Price } from '@mimo/shared'

export default defineEventHandler(async () => {
  const record = await prisma.price.findFirst({
    orderBy: { timestamp: 'desc' }
  })

  if (!record) {
    return {
      success: false,
      error: 'No price data available'
    }
  }

  const price: Price = {
    id: String(record.id),
    value: record.value,
    currency: record.currency as 'USD' | 'CNY',
    timestamp: Number(record.timestamp),
    source: record.source
  }

  return {
    success: true,
    data: price
  }
})

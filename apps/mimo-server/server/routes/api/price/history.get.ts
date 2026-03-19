import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '../../../utils/db'
import type { Price } from '@mimo/shared'

export default defineEventHandler(async (event) => {
  const limit = parseInt(getQuery(event).limit as string) || 100
  const offset = parseInt(getQuery(event).offset as string) || 0

  const records = await prisma.price.findMany({
    take: limit,
    skip: offset,
    orderBy: { timestamp: 'desc' }
  })

  const prices: Price[] = records.map(r => ({
    id: String(r.id),
    value: r.value,
    currency: r.currency as 'USD' | 'CNY',
    timestamp: Number(r.timestamp),
    source: r.source
  }))

  return {
    success: true,
    data: prices,
    total: await prisma.price.count()
  }
})

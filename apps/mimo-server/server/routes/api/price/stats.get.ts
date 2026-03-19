import { defineEventHandler } from 'h3'
import { prisma } from '../../../utils/db'
import type { PriceStats } from '@mimo/shared'

export default defineEventHandler(async () => {
  const now = Date.now()
  const dayAgo = now - 24 * 60 * 60 * 1000

  const records = await prisma.price.findMany({
    where: {
      timestamp: { gte: BigInt(dayAgo) }
    },
    orderBy: { timestamp: 'desc' }
  })

  if (records.length === 0) {
    return {
      success: true,
      data: {
        high: 0,
        low: 0,
        open: 0,
        close: 0,
        change: 0,
        changePercent: 0,
        period: '24h',
        updatedAt: now
      } as PriceStats
    }
  }

  const values = records.map(r => r.value)
  const high = Math.max(...values)
  const low = Math.min(...values)
  const open = values[values.length - 1]
  const close = values[0]
  const change = close - open
  const changePercent = open > 0 ? (change / open) * 100 : 0

  const stats: PriceStats = {
    high,
    low,
    open,
    close,
    change,
    changePercent,
    period: '24h',
    updatedAt: now
  }

  return {
    success: true,
    data: stats
  }
})

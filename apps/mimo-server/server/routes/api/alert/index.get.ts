import { defineEventHandler } from 'h3'
import { prisma } from '../../../utils/db'
import type { PriceAlert } from '@mimo/shared'
import type { PriceAlert as PrismaAlert } from '@prisma/client'

export default defineEventHandler(async () => {
  const alerts = await prisma.priceAlert.findMany({
    orderBy: { createdAt: 'desc' }
  })

  const result: PriceAlert[] = alerts.map((a: PrismaAlert): PriceAlert => ({
    id: a.id,
    userId: a.userId ?? undefined,
    type: a.type as 'above' | 'below',
    targetPrice: a.targetPrice,
    enabled: a.enabled,
    triggeredAt: a.triggeredAt ? Number(a.triggeredAt) : undefined,
    triggeredPrice: a.triggeredPrice ?? undefined,
    createdAt: a.createdAt.getTime(),
    updatedAt: a.updatedAt.getTime()
  }))

  return {
    success: true,
    data: result
  }
})

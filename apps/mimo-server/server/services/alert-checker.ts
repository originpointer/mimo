import type { Price, AlertTriggeredEvent } from '@mimo/shared'
import { prisma } from '../utils/db'
import { logger } from '../utils/logger'

class AlertChecker {
  async checkAndNotify(price: Price, io: any): Promise<void> {
    const alerts = await prisma.priceAlert.findMany({
      where: { enabled: true, triggeredAt: null }
    })

    for (const alert of alerts) {
      const triggered = this.isTriggered(price.value, alert)

      if (triggered) {
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: {
            triggeredAt: BigInt(Date.now()),
            triggeredPrice: price.value
          }
        })

        const event: AlertTriggeredEvent = {
          id: alert.id,
          type: alert.type as 'above' | 'below',
          targetPrice: alert.targetPrice,
          currentPrice: price.value,
          triggeredAt: Date.now()
        }

        io.emit('alert:triggered', event)
        logger.info({ alertId: alert.id, type: alert.type, targetPrice: alert.targetPrice }, 'Alert triggered')
      }
    }
  }

  private isTriggered(currentPrice: number, alert: { type: string; targetPrice: number }): boolean {
    if (alert.type === 'above') {
      return currentPrice >= alert.targetPrice
    } else {
      return currentPrice <= alert.targetPrice
    }
  }
}

export const alertChecker = new AlertChecker()

import type { Price } from '@mimo/shared'
import { prisma } from '../utils/db'
import { logger } from '../utils/logger'

class PriceStore {
  private cache: Price[] = []
  private readonly MAX_CACHE_SIZE = 1000

  async add(price: Price): Promise<void> {
    await prisma.price.create({
      data: {
        value: price.value,
        currency: price.currency,
        source: price.source,
        timestamp: price.timestamp
      }
    })

    this.cache.push(price)
    if (this.cache.length > this.MAX_CACHE_SIZE) {
      this.cache = this.cache.slice(-this.MAX_CACHE_SIZE)
    }

    logger.info({ price }, 'Price stored')
  }

  async getRecent(limit: number = 100): Promise<Price[]> {
    if (this.cache.length >= limit) {
      return this.cache.slice(-limit)
    }

    const records = await prisma.price.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' }
    })

    return records.map(r => ({
      id: String(r.id),
      value: r.value,
      currency: r.currency as 'USD' | 'CNY',
      timestamp: Number(r.timestamp),
      source: r.source
    })).reverse()
  }

  async getCurrent(): Promise<Price | null> {
    const record = await prisma.price.findFirst({
      orderBy: { timestamp: 'desc' }
    })

    if (!record) return null

    return {
      id: String(record.id),
      value: record.value,
      currency: record.currency as 'USD' | 'CNY',
      timestamp: Number(record.timestamp),
      source: record.source
    }
  }

  getLatest(): Price | null {
    return this.cache.length > 0 ? this.cache[this.cache.length - 1] : null
  }
}

export const priceStore = new PriceStore()

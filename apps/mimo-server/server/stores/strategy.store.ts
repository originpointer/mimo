import type { PageWatchStrategy } from '@mimo/shared'
import { prisma } from '../utils/db'

class StrategyStore {
  private cache: Map<string, PageWatchStrategy> = new Map()

  async loadAll(): Promise<void> {
    const records = await prisma.strategy.findMany({
      where: { enabled: true }
    })

    for (const record of records) {
      try {
        const strategy = JSON.parse(record.config) as PageWatchStrategy
        this.cache.set(record.id, strategy)
      } catch (e) {
        console.error(`Failed to parse strategy ${record.id}:`, e)
      }
    }
  }

  async getById(id: string): Promise<PageWatchStrategy | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!
    }

    const record = await prisma.strategy.findUnique({
      where: { id }
    })

    if (!record) return null

    return JSON.parse(record.config) as PageWatchStrategy
  }

  async getByUrl(url: string): Promise<PageWatchStrategy | null> {
    if (this.cache.size === 0) {
      await this.loadAll()
    }

    for (const strategy of this.cache.values()) {
      const patterns = Array.isArray(strategy.match.urlPattern)
        ? strategy.match.urlPattern
        : [strategy.match.urlPattern]

      for (const pattern of patterns) {
        if (this.matchPattern(url, pattern)) {
          return strategy
        }
      }
    }

    return null
  }

  private matchPattern(url: string, pattern: string): boolean {
    const regex = new RegExp(
      pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
    )
    return regex.test(url)
  }

  async upsert(strategy: PageWatchStrategy): Promise<void> {
    await prisma.strategy.upsert({
      where: { id: strategy.id },
      update: {
        version: strategy.version,
        name: strategy.name,
        config: JSON.stringify(strategy)
      },
      create: {
        id: strategy.id,
        version: strategy.version,
        name: strategy.name,
        config: JSON.stringify(strategy)
      }
    })

    this.cache.set(strategy.id, strategy)
  }

  getAll(): PageWatchStrategy[] {
    return Array.from(this.cache.values())
  }
}

export const strategyStore = new StrategyStore()

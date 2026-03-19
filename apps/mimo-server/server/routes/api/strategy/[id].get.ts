import { defineEventHandler, getRouterParam } from 'h3'
import { strategyStore } from '../../../stores/strategy.store'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    return { success: false, error: 'ID is required' }
  }

  // First check cache
  const strategy = strategyStore.getById(id)

  if (strategy) {
    return {
      success: true,
      data: strategy
    }
  }

  // Fallback to database
  const record = await prisma.strategy.findUnique({
    where: { id }
  })

  if (record) {
    try {
      const parsedStrategy = JSON.parse(record.config)
      return {
        success: true,
        data: parsedStrategy
      }
    } catch {
      return {
        success: false,
        error: 'Invalid strategy config'
      }
    }
  }

  return {
    success: false,
    error: 'Strategy not found'
  }
})

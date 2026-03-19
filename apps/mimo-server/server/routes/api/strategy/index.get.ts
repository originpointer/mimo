import { defineEventHandler } from 'h3'
import { strategyStore } from '../../../stores/strategy.store'

export default defineEventHandler(async () => {
  const strategies = strategyStore.getAll()

  return {
    success: true,
    data: strategies
  }
})

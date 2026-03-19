import { defineEventHandler } from 'h3'
import { priceStore } from '../../../stores/price.store'
import { decisionEngine } from '../../../services/decision-engine'

export default defineEventHandler(async () => {
  const prices = await priceStore.getRecent(100)
  const advice = decisionEngine.analyze(prices)

  return {
    success: true,
    data: advice
  }
})

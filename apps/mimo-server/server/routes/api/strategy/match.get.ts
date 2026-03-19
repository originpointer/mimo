import { defineEventHandler, getQuery } from 'h3'
import { strategyStore } from '../../../stores/strategy.store'

export default defineEventHandler(async (event) => {
  const url = getQuery(event).url as string

  if (!url) {
    return { success: false, error: 'url parameter is required' }
  }

  const strategy = await strategyStore.getByUrl(url)

  if (strategy) {
    return { success: true, data: strategy }
  }

  return { success: false, error: 'No matching strategy found' }
})

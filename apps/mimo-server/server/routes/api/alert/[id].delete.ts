import { defineEventHandler, getRouterParam } from 'h3'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    return {
      success: false,
      error: 'Alert ID is required'
    }
  }

  const alert = await prisma.priceAlert.findUnique({
    where: { id }
  })

  if (!alert) {
    return {
      success: false,
      error: 'Alert not found'
    }
  }

  await prisma.priceAlert.delete({
    where: { id }
  })

  return {
    success: true,
    data: { id }
  }
})

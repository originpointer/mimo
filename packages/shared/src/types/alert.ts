export type AlertType = 'above' | 'below'
export type AlertStatus = 'pending' | 'triggered' | 'disabled'

export interface PriceAlert {
  id: string
  userId?: string
  type: AlertType
  targetPrice: number
  enabled: boolean
  triggeredAt?: number
  triggeredPrice?: number
  createdAt: number
  updatedAt: number
}

export interface AlertTriggeredEvent {
  id: string
  type: AlertType
  targetPrice: number
  currentPrice: number
  triggeredAt: number
}

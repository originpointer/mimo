export interface Price {
  id: string
  value: number
  currency: 'USD' | 'CNY'
  timestamp: number
  source: string
}

export interface PriceDataPoint {
  time: number
  value: number
}

export interface PriceStats {
  high: number
  low: number
  open: number
  close: number
  change: number
  changePercent: number
  period: '1h' | '24h' | '7d' | '30d'
  updatedAt: number
}

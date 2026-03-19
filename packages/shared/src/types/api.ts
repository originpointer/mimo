import type { PageWatchStrategy } from './strategy'
import type { DecisionAdvice } from './advice'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
}

// 策略 API 响应
export type StrategyMatchResponse = ApiResponse<PageWatchStrategy>
export type StrategyListResponse = ApiResponse<PageWatchStrategy[]>

// 决策建议 API 响应
export type AdviceResponse = ApiResponse<DecisionAdvice>

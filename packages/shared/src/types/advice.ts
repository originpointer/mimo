/**
 * 趋势方向
 */
export type TrendDirection = 'up' | 'down' | 'neutral'

/**
 * 操作建议
 */
export type SuggestionType = 'buy' | 'sell' | 'hold'

/**
 * 风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high'

/**
 * 决策建议
 */
export interface DecisionAdvice {
  /** 趋势方向 */
  trend: TrendDirection
  /** 趋势强度 (0-100) */
  trendStrength: number
  /** 操作建议 */
  suggestion: SuggestionType
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 分析摘要 */
  summary: string
  /** 置信度 (0-100) */
  confidence: number
}

/**
 * 决策建议显示映射
 */
export const SUGGESTION_TEXT: Record<SuggestionType, string> = {
  buy: '建议买入',
  sell: '建议卖出',
  hold: '建议持有'
}

export const TREND_TEXT: Record<TrendDirection, string> = {
  up: '上涨',
  down: '下跌',
  neutral: '震荡'
}

export const RISK_TEXT: Record<RiskLevel, string> = {
  low: '低',
  medium: '中等',
  high: '高'
}

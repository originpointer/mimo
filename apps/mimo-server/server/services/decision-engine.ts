import type { Price, DecisionAdvice } from '@mimo/shared'

interface TrendResult {
  direction: 'up' | 'down' | 'neutral'
  strength: number
}

class DecisionEngine {
  /**
   * 根据历史价格生成决策建议
   */
  analyze(prices: Price[]): DecisionAdvice {
    if (prices.length < 10) {
      return this.defaultAdvice()
    }

    const values = prices.map(p => p.value)

    const ma5 = this.calculateMA(values, 5)
    const ma20 = this.calculateMA(values, Math.min(20, values.length))
    const trend = this.determineTrend(ma5, ma20)
    const volatility = this.calculateVolatility(values)
    const momentum = this.calculateMomentum(values)

    const suggestion = this.generateSuggestion(trend, momentum)
    const riskLevel = this.assessRisk(volatility, trend)
    const summary = this.generateSummary(trend, suggestion, riskLevel)

    return {
      trend: trend.direction,
      trendStrength: Math.round(trend.strength),
      suggestion,
      riskLevel,
      summary,
      confidence: this.calculateConfidence(trend, volatility)
    }
  }

  private calculateMA(values: number[], period: number): number[] {
    const result: number[] = []
    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / period)
    }
    return result
  }

  private determineTrend(ma5: number[], ma20: number[]): TrendResult {
    if (ma5.length === 0 || ma20.length === 0) {
      return { direction: 'neutral', strength: 50 }
    }

    const latest5 = ma5[ma5.length - 1]
    const latest20 = ma20[ma20.length - 1]
    const diff = ((latest5 - latest20) / latest20) * 100

    if (diff > 0.5) {
      return { direction: 'up', strength: Math.min(Math.abs(diff) * 20, 100) }
    } else if (diff < -0.5) {
      return { direction: 'down', strength: Math.min(Math.abs(diff) * 20, 100) }
    }
    return { direction: 'neutral', strength: 50 }
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0

    const returns: number[] = []
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1])
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    return Math.sqrt(variance)
  }

  private calculateMomentum(values: number[]): number {
    if (values.length < 10) return 0

    const recent = values.slice(-5).reduce((a, b) => a + b, 0) / 5
    const older = values.slice(-10, -5).reduce((a, b) => a + b, 0) / 5
    return ((recent - older) / older) * 100
  }

  private generateSuggestion(trend: TrendResult, momentum: number): 'buy' | 'sell' | 'hold' {
    if (trend.direction === 'up' && momentum > 0.5) return 'buy'
    if (trend.direction === 'down' && momentum < -0.5) return 'sell'
    return 'hold'
  }

  private assessRisk(volatility: number, trend: TrendResult): 'low' | 'medium' | 'high' {
    if (volatility > 0.02 || trend.strength > 80) return 'high'
    if (volatility > 0.01 || trend.strength > 60) return 'medium'
    return 'low'
  }

  private generateSummary(trend: TrendResult, suggestion: string, risk: string): string {
    const trendText = trend.direction === 'up' ? '上涨' : trend.direction === 'down' ? '下跌' : '震荡'
    const actionText = suggestion === 'buy' ? '建议买入' : suggestion === 'sell' ? '建议卖出' : '建议持有'
    const riskText = risk === 'high' ? '高' : risk === 'medium' ? '中等' : '低'
    return `当前价格处于${trendText}趋势中，${actionText}。风险等级：${riskText}。`
  }

  private calculateConfidence(trend: TrendResult, volatility: number): number {
    const trendScore = trend.strength
    const volatilityScore = Math.max(0, 100 - volatility * 5000)
    return Math.round((trendScore + volatilityScore) / 2)
  }

  private defaultAdvice(): DecisionAdvice {
    return {
      trend: 'neutral',
      trendStrength: 50,
      suggestion: 'hold',
      riskLevel: 'medium',
      summary: '数据不足，暂时无法给出明确建议。',
      confidence: 0
    }
  }
}

export const decisionEngine = new DecisionEngine()

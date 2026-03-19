'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { DecisionAdvice } from '@mimo/shared'
import { SUGGESTION_TEXT, TREND_TEXT, RISK_TEXT } from '@mimo/shared'

export default function AdviceCard() {
  const [advice, setAdvice] = useState<DecisionAdvice | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      path: '/socket.io',
      transports: ['websocket'],
    })

    newSocket.on('connect', () => {
      setSocket(newSocket)
      // 请求初始建议
      newSocket.emit('advice:get')
    })

    newSocket.on('advice:update', (data) => {
      setAdvice(data)
    })

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const getSuggestionColor = (suggestion: string) => {
    switch (suggestion) {
      case 'buy': return 'text-green-500 bg-green-50'
      case 'sell': return 'text-red-500 bg-red-50'
      default: return 'text-yellow-600 bg-yellow-50'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'high': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">决策建议</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">置信度</span>
          <span className="text-sm font-medium text-gray-900">
            {advice?.confidence ?? 0}%
          </span>
        </div>
      </div>

      {advice ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg ${getSuggestionColor(advice.suggestion)}`}>
              <span className="text-lg font-semibold">
                {SUGGESTION_TEXT[advice.suggestion]}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                趋势: <span className="font-medium text-gray-900">
                  {TREND_TEXT[advice.trend]}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                风险等级: <span className={`font-medium ${getRiskColor(advice.riskLevel)}`}>
                  {RISK_TEXT[advice.riskLevel]}
                </span>
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{advice.summary}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${advice.trendStrength}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">趋势强度 {advice.trendStrength}%</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">正在分析数据...</p>
        </div>
      )}
    </div>
  )
}

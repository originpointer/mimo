'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { PriceStats } from '@mimo/shared'

export default function StatsRow() {
  const [stats, setStats] = useState<PriceStats | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      path: '/socket.io',
      transports: ['websocket'],
    })

    newSocket.on('connect', () => {
      setSocket(newSocket)
    })

    newSocket.on('price:stats', (data) => {
      setStats(data)
    })

    // 获取初始统计
    newSocket.emit('price:getStats')

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const statCards = [
    {
      label: '最高价',
      value: stats?.high ?? 0,
      format: (v: number) => `$${v.toFixed(2)}`,
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    {
      label: '最低价',
      value: stats?.low ?? 0,
      format: (v: number) => `$${v.toFixed(2)}`,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
    {
      label: '开盘价',
      value: stats?.open ?? 0,
      format: (v: number) => `$${v.toFixed(2)}`,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: '涨跌幅',
      value: stats?.changePercent ?? 0,
      format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
      color: stats?.changePercent && stats.changePercent >= 0 ? 'text-green-500' : 'text-red-500',
      bg: stats?.changePercent && stats.changePercent >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className={`${stat.bg} rounded-xl p-4 border border-gray-200`}
        >
          <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
          <p className={`text-2xl font-bold ${stat.color}`}>
            {stat.format(stat.value)}
          </p>
        </div>
      ))}
    </div>
  )
}

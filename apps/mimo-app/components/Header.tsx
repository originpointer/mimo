'use client'

import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

export default function Header() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number>(0)

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      path: '/socket.io',
      transports: ['websocket'],
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      setSocket(newSocket)
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    newSocket.on('price:realtime', (data) => {
      setPrice(data.value)
    })

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const formatPrice = (p: number) => p.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <header className="flex items-center justify-between p-6 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">Au</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mimo</h1>
          <p className="text-xs text-gray-500">黄金价格监控</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          {isConnected ? '已连接' : '未连接'}
        </span>
      </div>

      <div className="text-right">
        <div className="text-3xl font-bold text-gray-900">
          {price ? `$${formatPrice(price)}` : '--'}
        </div>
        <div className={`text-sm font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(2)}%
        </div>
      </div>
    </header>
  )
}

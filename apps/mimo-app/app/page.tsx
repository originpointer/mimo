'use client'

import { useEffect, useState } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { io, Socket } from 'socket.io-client'
import Header from '@/components/Header'
import ChartSection from '@/components/ChartSection'
import StatsRow from '@/components/StatsRow'
import AlertCard from '@/components/AlertCard'
import AdviceCard from '@/components/AdviceCard'

export default function HomePage() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [stats, setStats] = useState({
    high: 0,
    low: 0,
    open: 0,
    close: 0,
    change: 0,
    changePercent: 0
  })
  const [alerts, setAlerts] = useState<any[]>([])
  const [advice, setAdvice] = useState<any | null>(null)

  // 初始化 Socket.io 连接
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      path: '/socket.io',
      transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    newSocket.on('connect', () => {
      console.log('[Socket] Connected')
      setSocket(newSocket)
    })

    newSocket.on('connect_error', (error) => {
      console.log('[Socket] Connection error:', error.message)
    })

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      setSocket(null)
    })

    newSocket.on('price:realtime', (data) => {
      setPrice(data.value)
    })

    newSocket.on('price:stats', (data) => {
      setStats(data)
    })

    newSocket.on('alert:triggered', (data) => {
      console.log('[Alert] Triggered:', data)
    })

    newSocket.on('advice:update', (data) => {
      setAdvice(data)
    })

    return () => {
      newSocket.disconnect()
    }
  }, [])

  return (
    <main className='min-h-screen bg-gray-50 p-6'>
      <Header />
      <ChartSection />
      <StatsRow />
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6'>
        <AlertCard />
        <AdviceCard />
      </div>
    </main>
  )
}

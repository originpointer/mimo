'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, CandlestickData, LineData } from 'lightweight-charts'
import { io, Socket } from 'socket.io-client'

export default function ChartSection() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [period, setPeriod] = useState<'1H' | '4H' | '1D' | '1W'>('1H')
  const [alertLines, setAlertLines] = useState<{ price: number; type: 'above' | 'below' }[]>([])

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#666',
      },
      grid: {
        vertLines: { color: '#e5e7eb' },
        horzLines: { color: '#e5e7eb' },
      },
      crosshair: {
        mode: 'normal',
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
      },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: true,
      },
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart

    // 模拟数据
    const now = Date.now()
    const mockData: CandlestickData[] = []
    for (let i = 0; i < 100; i++) {
      const time = Math.floor((now - (100 - i) * 60 * 60 * 1000) / 1000)
      const base = 2000 + Math.random() * 100
      mockData.push({
        time,
        open: base,
        high: base + Math.random() * 10,
        low: base - Math.random() * 10,
        close: base + (Math.random() - 0.5) * 20,
      })
    }

    candlestickSeries.setData(mockData)

    return () => {
    chart.remove()
  }
  }, [])

  // Socket 连接
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      path: '/socket.io',
      transports: ['websocket'],
    })

    newSocket.on('connect', () => {
      setSocket(newSocket)
    })

    // 接收价格提醒设置
    newSocket.emit('alert:subscribe', 'all')

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const periods = [
    { value: '1H', label: '1小时' },
    { value: '4H', label: '4小时' },
    { value: '1D', label: '1天' },
    { value: '1W', label: '1周' },
  ]

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">价格走势</h2>
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value as any)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                period === p.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={chartContainerRef} className="h-[400px] w-full" />
    </section>
  )
}

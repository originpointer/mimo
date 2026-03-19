'use client'

import { useState } from 'react'
import type { PriceAlert } from '@mimo/shared'

export default function AlertCard() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newAlert, setNewAlert] = useState({
    type: 'above' as 'above' | 'below',
    targetPrice: 0,
  })

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert),
      })

      if (response.ok) {
        const data = await response.json()
        setAlerts([...alerts, data.data])
        setShowForm(false)
        setNewAlert({ type: 'above', targetPrice: 0 })
      }
    } catch (error) {
      console.error('Failed to create alert:', error)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">价格提醒</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1 text-sm bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
        >
          {showForm ? '取消' : '添加提醒'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex gap-4">
            <select
              value={newAlert.type}
              onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value as any })}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              <option value="above">高于</option>
              <option value="below">低于</option>
            </select>
            <input
              type="number"
              placeholder="目标价格"
              value={newAlert.targetPrice || ''}
              onChange={(e) => setNewAlert({ ...newAlert, targetPrice: parseFloat(e.target.value) })}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm"
            />
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-amber-500 text-white rounded-md text-sm hover:bg-amber-600 transition-colors"
            >
              创建
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            暂无提醒设置
          </p>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  alert.type === 'above' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {alert.type === 'above' ? '高于' : '低于'} ${alert.targetPrice}
                  </p>
                  <p className="text-xs text-gray-500">
                    {alert.enabled ? '已启用' : '已禁用'}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  await fetch(`http://localhost:3001/api/alert/${alert.id}`, { method: 'DELETE' })
                  setAlerts(alerts.filter((a) => a.id !== alert.id))
                }}
                className="text-sm text-red-500 hover:text-red-600"
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

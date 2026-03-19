import type { Price, PriceStats } from '../types/price'
import type { PriceAlert, AlertTriggeredEvent } from '../types/alert'
import type { DecisionAdvice } from '../types/advice'

/**
 * 服务端 → 客户端 事件
 */
export interface ServerToClientEvents {
  /** 实时价格推送 */
  'price:realtime': (data: Price) => void
  /** 价格统计更新 */
  'price:stats': (data: PriceStats) => void
  /** 提醒触发通知 */
  'alert:triggered': (data: AlertTriggeredEvent) => void
  /** 决策建议更新 */
  'advice:update': (data: DecisionAdvice) => void
}

/**
 * 客户端 → 服务端 事件（插件）
 */
export interface ClientToServerEvents {
  /** 价格数据上传 */
  'price:update': (data: Price) => void
  /** 订阅提醒 */
  'alert:subscribe': (alertId: string) => void
  /** 取消订阅 */
  'alert:unsubscribe': (alertId: string) => void
}

/**
 * Socket 事件类型汇总
 */
export interface SocketEvents extends
  ServerToClientEvents,
  ClientToServerEvents {}

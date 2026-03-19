import { initSocket, uploadPrice } from './socket/client'
import { startKeepalive, setupKeepaliveListener, setupPriceUpdateListener } from './keepalive'

export const bootstrap = async (): Promise<void> => {
  console.log('[Background] Starting...')

  // 1. 启动保活机制
  startKeepalive()
  setupKeepaliveListener()

  // 2. 监听价格更新消息
  setupPriceUpdateListener(uploadPrice)

  // 3. 建立 Socket.io 长连接
  initSocket()

  console.log('[Background] Bootstrap complete')
}

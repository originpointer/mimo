import { useState, useEffect } from 'react'
import { useConnectionStore } from '../background/stores'

function Popup() {
  const [price, setPrice] = useState<number | null>(null)
  const connectionStatus = useConnectionStore((state) => state.status)

  useEffect(() => {
    // 监听价格更新
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'PRICE_UPDATE') {
        setPrice(message.data.price)
      }
    })
  }, [])

  const statusColor = {
    connected: '#22c55e',
    disconnected: '#ef4444',
    reconnecting: '#f59e0b'
  }

  const statusText = {
    connected: '已连接',
    disconnected: '未连接',
    reconnecting: '重连中...'
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Mimo</h1>
        <div style={{
          ...styles.status,
          backgroundColor: statusColor[connectionStatus]
        }}>
          {statusText[connectionStatus]}
        </div>
      </div>

      <div style={styles.priceSection}>
        <span style={styles.label}>黄金价格</span>
        <span style={styles.price}>
          {price ? `$${price.toFixed(2)}` : '--'}
        </span>
      </div>

      <div style={styles.footer}>
        <a
          href="https://cn.investing.com/commodities/gold"
          target="_blank"
          style={styles.link}
        >
          打开 investing.com →
        </a>
      </div>
    </div>
  )
}

const styles = {
  container: {
    width: '280px',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
  },
  status: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
  },
  priceSection: {
    textAlign: 'center',
    padding: '20px 0',
  },
  label: {
    fontSize: '14px',
    color: '#666',
    display: 'block',
    marginBottom: '8px',
  },
  price: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
  },
  footer: {
    marginTop: '16px',
    textAlign: 'center',
  },
  link: {
    color: '#0066cc',
    textDecoration: 'none',
    fontSize: '14px',
  }
}

export default Popup

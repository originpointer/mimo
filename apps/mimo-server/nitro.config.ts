import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  compatibilityDate: '2025-03-19',
  devServer: {
    port: 3001
  },
  scanDirs: ['server'],
  features: {
    websocket: true
  },
  hooks: {
    // Handle errors during development
    'dev:error': (error) => {
      if ((error as any).code === 'ECONNRESET') {
        console.log('[Nitro] Connection reset by peer (ignored)')
        return
      }
      console.error('[Nitro] Dev error:', error)
    }
  }
})

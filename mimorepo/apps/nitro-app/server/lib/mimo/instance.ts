/**
 * Mimo Instance Manager
 *
 * Manages the singleton Mimo instance for the nitro-app server.
 *
 * DEMO MODE: When MIMO_DEMO_MODE is enabled, returns a mock instance
 * that simulates responses without requiring the browser extension.
 */

import { Mimo } from '@mimo/core'

let mimoInstance: Mimo | null = null
let demoMode = process.env.MIMO_DEMO_MODE === 'true'
let initializationPromise: Promise<void> | null = null

/**
 * Mock Mimo instance for demo/testing mode
 * Simulates browser automation responses without requiring the extension
 */
class MockMimo {
  private verbose: number

  constructor(verbose: number) {
    this.verbose = verbose
    console.log('[Mimo Mock] Demo mode enabled - browser extension not required')
  }

  async navigate(url: string, options?: any) {
    if (this.verbose > 0) console.log('[Mimo Mock] navigate called:', { url, options })
    await this.delay(500)
    return {
      success: true,
      message: `Demo: Navigated to ${url} (no actual browser action)`,
      url,
    }
  }

  async act(input: string, options?: any) {
    console.log('[Mimo Mock] act called:', { input, options })
    await this.delay(300)
    return {
      success: true,
      message: `Demo: Executed action "${input}" (no actual browser action)`,
      actionDescription: input,
      actions: [{ description: input }],
    }
  }

  async extract(instruction: string, schema?: any, options?: any) {
    console.log('[Mimo Mock] extract called:', { instruction, schema, options })
    await this.delay(400)
    return {
      extraction: { demo: 'Sample extracted data' },
      success: true,
      message: 'Demo: Data extracted (no actual browser action)',
    }
  }

  async observe(instruction?: string, options?: any) {
    console.log('[Mimo Mock] observe called:', { instruction, options })
    await this.delay(300)
    return [
      { description: 'Click search button', selector: '#search' },
      { description: 'Type in input field', selector: 'input[type="text"]' },
    ]
  }

  agent(config?: any) {
    console.log('[Mimo Mock] agent called:', config)
    const self = this
    return {
      async run(instruction: string) {
        console.log('[Mimo Mock] agent.run called:', instruction)
        await self.delay(1000)
        return {
          success: true,
          message: `Demo: Agent executed "${instruction}" (no actual browser action)`,
          steps: [{ action: instruction, result: 'completed' }],
        }
      },
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Get or create the Mimo singleton instance
 */
export async function getMimoInstance(): Promise<Mimo | any> {
  if (demoMode) {
    console.log('[Mimo] Returning mock instance for demo mode')
    return new MockMimo(
      process.env.MIMO_VERBOSE === '2' ? 2 : process.env.MIMO_VERBOSE === '1' ? 1 : 0
    )
  }

  // Initialize connection if not already done
  if (!initializationPromise) {
    initializationPromise = initializeMimo()
  }

  // Wait for initialization to complete
  await initializationPromise

  return mimoInstance!
}

/**
 * Initialize Mimo instance and connect to Socket.IO server
 */
async function initializeMimo(): Promise<void> {
  const verbose = process.env.MIMO_VERBOSE === '2' ? 2 : process.env.MIMO_VERBOSE === '1' ? 1 : 0
  const socketUrl = process.env.MIMO_SOCKET_URL || 'ws://localhost:6007/socket.io/'

  console.log('[Mimo] Initializing with Socket.IO server...')
  console.log('[Mimo] Socket URL:', socketUrl)
  console.log('[Mimo] Verbose level:', verbose)

  try {
    console.log('[Mimo] Creating Mimo instance...')
    mimoInstance = new Mimo({
      socket: {
        url: socketUrl,
        autoReconnect: true,
        reconnectInterval: 1000,
      },
      verbose,
      commandTimeout: parseInt(process.env.MIMO_COMMAND_TIMEOUT || '30000', 10),
    })

    console.log('[Mimo] Instance created, initializing connection...')
    // Initialize connection
    await mimoInstance.init()

    console.log('[Mimo] Connected to Socket.IO server successfully')
  } catch (error: any) {
    console.error('[Mimo] Initialization failed:', error.message)
    console.error('[Mimo] Error details:', error)
    console.warn('[Mimo] Falling back to demo mode')

    // Fallback to demo mode
    demoMode = true
    mimoInstance = new MockMimo(verbose) as any
  }
}

/**
 * Initialize Mimo (wrapper for getMimoInstance)
 * This function is now equivalent to getMimoInstance
 */
export async function initMimo(): Promise<Mimo | any> {
  return getMimoInstance()
}

/**
 * Close and cleanup the Mimo instance
 */
export async function closeMimo(): Promise<void> {
  if (mimoInstance) {
    await mimoInstance.close({ force: true })
    mimoInstance = null
    console.log('[Mimo] Instance closed')
  }
}

/**
 * Reset the Mimo instance (useful for testing)
 */
export function resetMimoInstance(): void {
  if (mimoInstance) {
    mimoInstance = null
  }
}

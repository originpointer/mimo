import pino from 'pino'
import fs from 'node:fs'
import path from 'node:path'

// Ensure .logs directory exists
const logDir = path.resolve(process.cwd(), '.logs')
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true })
  } catch (err) {
    console.error('Failed to create log directory:', err)
  }
}

const logFile = path.join(logDir, 'mimo.log')

const stream = pino.destination({
  dest: logFile,
  sync: false, // Asynchronous logging for better performance
  mkdir: true
})

const rootLogger = pino(
  {
    level: 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  stream
)

export const createLogger = (name: string) => {
  return rootLogger.child({ name })
}


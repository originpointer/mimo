/**
 * Logger - Pino-based logging with disk support
 *
 * Provides structured JSON logging with daily file rotation
 * for connection statistics and stability analysis.
 */

import pino from 'pino';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { StreamEntry } from 'pino';

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Log level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' */
  level?: string;
  /** Directory for log files (default: './logs') */
  logDir?: string;
  /** Enable pretty printing for console (default: false) */
  prettyPrint?: boolean;
  /** Log file name pattern (default: 'mimo-bus') */
  logName?: string;
}

/**
 * Get daily log filename
 * Format: logName-YYYY-MM-DD.log
 */
function getDailyLogFilename(logName: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `${logName}-${date}.log`;
}

/**
 * Ensure log directory exists
 */
async function ensureLogDir(logDir: string): Promise<void> {
  if (!existsSync(logDir)) {
    await mkdir(logDir, { recursive: true });
  }
}

/**
 * Create pino logger with daily file rotation
 *
 * @param options - Logger configuration
 * @returns Pino logger instance
 */
export function createLogger(options: LoggerConfig = {}): pino.Logger {
  const logLevel = (options.level ?? 'info') as pino.Level;
  const logDir = options.logDir ?? './logs';
  const logName = options.logName ?? 'mimo-bus';
  const prettyPrint = options.prettyPrint ?? false;

  // Build streams array for multistream
  const streams: StreamEntry[] = [];

  // Console transport with optional pretty print
  if (prettyPrint) {
    streams.push({
      level: logLevel,
      stream: pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:iso',
          ignore: 'pid,hostname',
        },
      }),
    });
  } else {
    streams.push({
      level: logLevel,
      stream: process.stdout,
    });
  }

  // File transport for disk logging
  const logFilePath = join(logDir, getDailyLogFilename(logName));

  // Ensure log directory exists (async, but we'll let pino handle errors)
  ensureLogDir(logDir).catch((err) => {
    console.error('[Logger] Failed to create log directory:', err);
  });

  streams.push({
    level: logLevel,
    stream: pino.destination({
      dest: logFilePath,
      mkdir: true,
    }),
  });

  const multi = pino.multistream(streams);

  return pino(
    {
      level: logLevel,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      serializers: {
        error: pino.stdSerializers.err,
      },
    },
    multi
  );
}

/**
 * Create a child logger with additional context
 *
 * @param parent - Parent logger
 * @param context - Additional context fields
 * @returns Child logger
 */
export function createChildLogger(
  parent: pino.Logger,
  context: Record<string, unknown>
): pino.Logger {
  return parent.child(context);
}

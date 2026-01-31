/**
 * Log level enum
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/**
 * Global log level
 */
let globalLogLevel: LogLevel = LogLevel.DEBUG;

/**
 * Reset global log level (for testing)
 */
export function resetGlobalLogLevel(): void {
    globalLogLevel = LogLevel.DEBUG;
}

/**
 * Set the global log level for all loggers
 */
export function setGlobalLogLevel(level: LogLevel): void {
    globalLogLevel = level;
}

/**
 * Get the current global log level
 */
export function getGlobalLogLevel(): LogLevel {
    return globalLogLevel;
}

/**
 * Logger class with context and log level support
 */
export class Logger {
    private context: string;
    private level: LogLevel;
    private hasExplicitLevel: boolean;

    constructor(context: string = '', level?: LogLevel) {
        this.context = context;
        // Loggers without explicit level use DEBUG as base (most permissive)
        this.level = level ?? LogLevel.DEBUG;
        this.hasExplicitLevel = level !== undefined;
    }

    /**
     * Set the log level for this logger
     */
    setLevel(level: LogLevel): void {
        this.level = level;
        this.hasExplicitLevel = true;
    }

    /**
     * Get the current log level
     */
    getLevel(): LogLevel {
        return this.level;
    }

    /**
     * Check if a log level should be printed
     * - If logger has explicit level: only logger level matters (ignores global)
     * - If logger has default level: effective is max(logger level, globalLogLevel)
     *   This allows setGlobalLogLevel to raise the threshold for default loggers
     */
    private shouldLog(level: LogLevel): boolean {
        if (this.hasExplicitLevel) {
            return level >= this.level;
        }
        // For default loggers: effective threshold is the higher of logger level and current global
        const effectiveThreshold = Math.max(this.level, globalLogLevel);
        return level >= effectiveThreshold;
    }

    private formatMessage(level: string, message: string): string {
        const levelStr = `[${level}]`;
        return this.context ? `${this.context} ${levelStr} ${message}` : `${levelStr} ${message}`;
    }

    debug(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.formatMessage('DEBUG', message), ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(this.formatMessage('INFO', message), ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage('WARN', message), ...args);
        }
    }

    error(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.formatMessage('ERROR', message), ...args);
        }
    }
}

/**
 * Create a logger with a specific context
 */
export function createLogger(context: string, level?: LogLevel): Logger {
    return new Logger(context, level);
}

// Legacy exports for backward compatibility
export interface ILogger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

/**
 * Simple console logger implementation (legacy)
 */
export class ConsoleLogger implements ILogger {
    constructor(
        private level: LogLevel = LogLevel.INFO,
        private prefix = '[MimoAgent]'
    ) {}

    debug(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(`${this.prefix} [DEBUG]`, message, ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.INFO) {
            console.info(`${this.prefix} [INFO]`, message, ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.WARN) {
            console.warn(`${this.prefix} [WARN]`, message, ...args);
        }
    }

    error(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.ERROR) {
            console.error(`${this.prefix} [ERROR]`, message, ...args);
        }
    }
}

/**
 * Legacy createLogger function with the old signature
 */
export function createConsoleLogger(context: string, level?: LogLevel): ILogger {
    return new ConsoleLogger(level, `[MimoAgent:${context}]`);
}

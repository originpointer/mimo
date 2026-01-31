/**
 * 日志级别
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/**
 * 日志接口
 */
export interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

/**
 * 简单日志实现
 */
export class ConsoleLogger implements Logger {
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
 * 创建带上下文的日志器
 */
export function createLogger(context: string, level?: LogLevel): Logger {
    return new ConsoleLogger(level, `[MimoAgent:${context}]`);
}

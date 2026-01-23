/**
 * Logger utility for MimoBus
 */

export interface LoggerOptions {
  debug?: boolean;
}

export type LogLevel = 0 | 1 | 2;

export interface LoggerData {
  level?: LogLevel;
  [key: string]: unknown;
}

/**
 * Create a logger function
 */
export function createLogger(name: string, options: LoggerOptions = {}): (message: string, data: LoggerData) => void {
  return (message: string, { level = 1, ...data }: LoggerData): void => {
    if (!options.debug || level < (options.debug ? 1 : 2)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${name} ${timestamp}]`;

    switch (level) {
      case 0:
        console.error(prefix, message, data);
        break;
      case 1:
        console.log(prefix, message, data);
        break;
      case 2:
        console.debug(prefix, message, data);
        break;
    }
  };
}

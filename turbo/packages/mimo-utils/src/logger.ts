export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export type Logger = {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
};

export type CreateLoggerOptions = {
  scope: string;
  fields?: LogFields;
  minLevel?: LogLevel;
};

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function writeLog(
  level: LogLevel,
  payload: Record<string, unknown>,
): void {
  const writer =
    level in console ? (console[level as keyof Console] as unknown) : undefined;

  const fn = typeof writer === "function" ? writer : console.log;
  fn.call(console, payload);
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const { scope, fields = {}, minLevel = "debug" } = options;
  const minOrder = LOG_LEVEL_ORDER[minLevel];

  const log = (level: LogLevel, message: string, extraFields?: LogFields) => {
    if (LOG_LEVEL_ORDER[level] < minOrder) {
      return;
    }

    writeLog(level, {
      timestamp: Date.now(),
      level,
      scope,
      message,
      ...fields,
      ...extraFields,
    });
  };

  return {
    debug: (message, extraFields) => log("debug", message, extraFields),
    info: (message, extraFields) => log("info", message, extraFields),
    warn: (message, extraFields) => log("warn", message, extraFields),
    error: (message, extraFields) => log("error", message, extraFields),
  };
}

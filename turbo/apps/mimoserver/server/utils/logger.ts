export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    if (meta) console.log(`[mimoserver] ${message}`, meta);
    else console.log(`[mimoserver] ${message}`);
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (meta) console.warn(`[mimoserver] ${message}`, meta);
    else console.warn(`[mimoserver] ${message}`);
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    if (meta) console.error(`[mimoserver] ${message}`, meta);
    else console.error(`[mimoserver] ${message}`);
  },
};

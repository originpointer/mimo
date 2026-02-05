import pino from "pino";
import { join } from "node:path";

const logsDir = join(process.cwd(), ".data", "logs");

// 创建 pino logger，支持多输出目标
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream([
    // 控制台输出（带颜色）
    {
      stream: pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }),
    },
    // 文件输出（用于调试）
    {
      level: "debug",
      stream: pino.destination({
        dest: join(logsDir, "mimoserver.log"),
        sync: false,
        mkdir: true,  // 自动创建目录
      }),
    },
  ])
);

// 创建专门的调试日志 logger
export const debugLogger = pino(
  {
    level: "debug",
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.destination({
    dest: join(logsDir, "debug.log"),
    sync: false,
    mkdir: true,  // 自动创建目录
  })
);

import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

function isoDate(): string {
  // YYYY-MM-DD in UTC (stable across TZ)
  return new Date().toISOString().slice(0, 10);
}

function ensureDirSync(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // best-effort
  }
}

function getDataDir(): string {
  // Save under the mimoserver project root `.data/`
  return path.resolve(process.cwd(), '.data');
}

function getLogFilePath(): string {
  const logDir = path.join(getDataDir(), 'logs');
  ensureDirSync(logDir);
  return path.join(logDir, `${isoDate()}.log`);
}

const fileDestination = pino.destination({
  dest: getLogFilePath(),
  sync: false,
});

export const logger = pino(
  {
    name: 'mimoserver',
    level: process.env.LOG_LEVEL ?? 'info',
  },
  pino.multistream([{ stream: process.stdout }, { stream: fileDestination }])
);


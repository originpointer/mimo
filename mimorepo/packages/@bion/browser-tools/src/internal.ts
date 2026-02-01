import type { ToolExecutionContext } from '@mimo/agent-core/types';
import type { BrowserToolsConfig } from './types.js';

export function getBrowserToolsConfig(context: ToolExecutionContext): BrowserToolsConfig {
  const cfg = (context?.config as any)?.browserTools as BrowserToolsConfig | undefined;
  if (!cfg) throw new Error('Missing context.config.browserTools');
  if (!cfg.transport) throw new Error('Missing context.config.browserTools.transport');
  if (!cfg.sessionId) throw new Error('Missing context.config.browserTools.sessionId');
  if (!cfg.clientId) throw new Error('Missing context.config.browserTools.clientId');
  if (typeof cfg.createActionId !== 'function') throw new Error('Missing context.config.browserTools.createActionId');
  return cfg;
}


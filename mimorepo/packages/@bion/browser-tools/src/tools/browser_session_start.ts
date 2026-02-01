import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserSessionStartParams = z.object({
  requestId: z.string().min(1),
  summary: z.string().min(1),
  title: z.string().min(1),
  initialUrl: z.string().url().optional(),
  targetEventId: z.string().optional(),
});

export type BrowserSessionStartParams = z.infer<typeof browserSessionStartParams>;

export function createBrowserSessionStartTool(): ToolDefinition<BrowserSessionStartParams> {
  const tool: any = {
    name: 'browser_session_start',
    description: 'Start a browser automation session (creates/attaches a dedicated tab and tabGroup).',
    parameters: browserSessionStartParams,
    group: 'browser',
    async execute(params: BrowserSessionStartParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'session/start',
        params: {
          requestId: params.requestId,
          summary: params.summary,
          title: params.title,
          initialUrl: params.initialUrl,
          targetEventId: params.targetEventId,
        },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserSessionStartParams>;
}


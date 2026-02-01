import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserSessionStopParams = z.object({
  requestId: z.string().min(1),
});

export type BrowserSessionStopParams = z.infer<typeof browserSessionStopParams>;

export function createBrowserSessionStopTool(): ToolDefinition<BrowserSessionStopParams> {
  const tool: any = {
    name: 'browser_session_stop',
    description: 'Stop a browser automation session (detaches debugger and releases tab).',
    parameters: browserSessionStopParams,
    group: 'browser',
    async execute(params: BrowserSessionStopParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'session/stop',
        params: { requestId: params.requestId },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserSessionStopParams>;
}


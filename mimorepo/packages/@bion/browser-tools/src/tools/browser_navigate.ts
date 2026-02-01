import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserNavigateParams = z.object({
  url: z.string().url(),
});

export type BrowserNavigateParams = z.infer<typeof browserNavigateParams>;

export function createBrowserNavigateTool(): ToolDefinition<BrowserNavigateParams> {
  const tool: any = {
    name: 'browser_navigate',
    description: 'Navigate the active browser task tab to a URL.',
    parameters: browserNavigateParams,
    group: 'browser',
    async execute(params: BrowserNavigateParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_navigate',
        params: { url: params.url },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserNavigateParams>;
}


import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const TabGroupColor = z.enum(['grey', 'blue', 'green', 'yellow', 'red', 'cyan', 'orange', 'pink', 'purple']);

export const browserTabGroupCreateParams = z.object({
  taskName: z.string().min(1),
  color: TabGroupColor,
  urls: z.array(z.string().url()).optional(),
});

export type BrowserTabGroupCreateParams = z.infer<typeof browserTabGroupCreateParams>;
export type TabGroupColor = z.infer<typeof TabGroupColor>;

export function createBrowserTabGroupCreateTool(): ToolDefinition<BrowserTabGroupCreateParams> {
  const tool: any = {
    name: 'browser_tab_group_create',
    description: 'Create a browser tab group for task organization. Group related tabs together with a label and color for better workflow management.',
    parameters: browserTabGroupCreateParams,
    group: 'browser',
    async execute(params: BrowserTabGroupCreateParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_createTabGroup',
        params: {
          taskName: params.taskName,
          color: params.color,
          urls: params.urls,
        },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserTabGroupCreateParams>;
}

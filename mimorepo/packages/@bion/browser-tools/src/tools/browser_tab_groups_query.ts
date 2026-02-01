import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserTabGroupsQueryParams = z.object({});

export type BrowserTabGroupsQueryParams = z.infer<typeof browserTabGroupsQueryParams>;

export function createBrowserTabGroupsQueryTool(): ToolDefinition<BrowserTabGroupsQueryParams> {
  const tool: any = {
    name: 'browser_tab_groups_query',
    description: 'List all existing browser tab groups. Returns information about organized tab groups including their names, colors, and associated tabs.',
    parameters: browserTabGroupsQueryParams,
    group: 'browser',
    async execute(_params: BrowserTabGroupsQueryParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_queryTabGroups',
        params: {},
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserTabGroupsQueryParams>;
}

import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserWindowFocusParams = z.object({});

export type BrowserWindowFocusParams = z.infer<typeof browserWindowFocusParams>;

export function createBrowserWindowFocusTool(): ToolDefinition<BrowserWindowFocusParams> {
  const tool: any = {
    name: 'browser_window_focus',
    description: 'Bring the target tab/window to focus. Ensures the browser tab is active and visible before performing interactions.',
    parameters: browserWindowFocusParams,
    group: 'browser',
    async execute(_params: BrowserWindowFocusParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_windowFocus',
        params: {},
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserWindowFocusParams>;
}

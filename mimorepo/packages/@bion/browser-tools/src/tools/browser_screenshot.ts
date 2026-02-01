import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserScreenshotParams = z.object({
  /**
   * Optional hint for the adapter/extension about screenshot usage.
   */
  reason: z.string().optional(),
});

export type BrowserScreenshotParams = z.infer<typeof browserScreenshotParams>;

export function createBrowserScreenshotTool(): ToolDefinition<BrowserScreenshotParams> {
  const tool: any = {
    name: 'browser_screenshot',
    description: 'Capture a screenshot of the current page (best-effort).',
    parameters: browserScreenshotParams,
    group: 'browser',
    async execute(params: BrowserScreenshotParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_screenshot',
        params: { reason: params.reason },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserScreenshotParams>;
}


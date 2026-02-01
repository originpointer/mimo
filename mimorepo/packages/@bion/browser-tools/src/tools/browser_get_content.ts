import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserGetContentParams = z.object({
  /**
   * Max characters for returned markdown/text (best-effort).
   */
  maxChars: z.number().int().positive().max(500_000).optional(),
});

export type BrowserGetContentParams = z.infer<typeof browserGetContentParams>;

export function createBrowserGetContentTool(): ToolDefinition<BrowserGetContentParams> {
  const tool: any = {
    name: 'browser_get_content',
    description: 'Get current page content (markdown/text + basic metadata) for LLM observation.',
    parameters: browserGetContentParams,
    group: 'browser',
    async execute(params: BrowserGetContentParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        // Extension currently uses Manus-compatible name `browser_getContent`
        actionName: 'browser_getContent',
        params: { maxChars: params.maxChars },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserGetContentParams>;
}


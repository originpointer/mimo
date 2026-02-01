import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserClickParams = z
  .object({
    selector: z.string().min(1).optional(),
    xpath: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.selector || v.xpath), { message: 'selector or xpath is required' });

export type BrowserClickParams = z.infer<typeof browserClickParams>;

export function createBrowserClickTool(): ToolDefinition<BrowserClickParams> {
  const tool: any = {
    name: 'browser_click',
    description: 'Click an element on the current page (selector or xpath).',
    parameters: browserClickParams,
    group: 'browser',
    async execute(params: BrowserClickParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_click',
        params: { selector: params.selector, xpath: params.xpath },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserClickParams>;
}


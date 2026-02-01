import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserFillParams = z
  .object({
    selector: z.string().min(1).optional(),
    xpath: z.string().min(1).optional(),
    text: z.string(),
  })
  .refine((v) => Boolean(v.selector || v.xpath), { message: 'selector or xpath is required' });

export type BrowserFillParams = z.infer<typeof browserFillParams>;

export function createBrowserFillTool(): ToolDefinition<BrowserFillParams> {
  const tool: any = {
    name: 'browser_fill',
    description: 'Fill an input/textarea element with text (selector or xpath).',
    parameters: browserFillParams,
    group: 'browser',
    async execute(params: BrowserFillParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_fill',
        params: { selector: params.selector, xpath: params.xpath, text: params.text },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserFillParams>;
}


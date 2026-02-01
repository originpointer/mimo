import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserCdpClickParams = z.object({
  xpath: z.string().min(1),
});

export type BrowserCdpClickParams = z.infer<typeof browserCdpClickParams>;

export function createBrowserCdpClickTool(): ToolDefinition<BrowserCdpClickParams> {
  const tool: any = {
    name: 'browser_cdp_click',
    description: 'Click an element using Chrome DevTools Protocol (CDP) by XPath. More reliable than JavaScript clicks as it simulates real mouse input at the operating system level.',
    parameters: browserCdpClickParams,
    group: 'browser',
    async execute(params: BrowserCdpClickParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_cdpClickByXpath',
        params: {
          xpath: params.xpath,
        },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserCdpClickParams>;
}

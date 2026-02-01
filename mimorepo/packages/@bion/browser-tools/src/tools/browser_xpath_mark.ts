import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserXpathMarkParams = z.object({
  xpaths: z.array(z.string()).optional(),
  // Backward/LLM-friendly: allow passing scan.items directly.
  items: z.array(z.object({ xpath: z.string() })).optional(),
  mode: z.enum(['mark', 'clear']).default('mark'),
}).refine((v) => (v.mode === 'clear' ? true : Boolean(v.xpaths?.length || v.items?.length)), {
  message: 'xpaths (or items) is required unless mode=clear',
});

export type BrowserXpathMarkParams = z.infer<typeof browserXpathMarkParams>;

export function createBrowserXpathMarkTool(): ToolDefinition<BrowserXpathMarkParams> {
  const tool: any = {
    name: 'browser_xpath_mark',
    description: 'Visually mark elements on the page using CSS outlines for debugging or verification. Use "mark" mode to highlight elements and "clear" mode to remove all markings.',
    parameters: browserXpathMarkParams,
    group: 'browser',
    async execute(params: BrowserXpathMarkParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const xpaths = (params.xpaths ?? params.items?.map((x) => x.xpath) ?? []).filter(Boolean);
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_xpathMarkElements',
        params: {
          xpaths,
          mode: params.mode,
        },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserXpathMarkParams>;
}

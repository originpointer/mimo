import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserXpathScanParams = z.object({
  maxItems: z.number().min(1).optional().default(200),
  selector: z.string().optional().default("a,button,input,textarea,select,[role='button'],[onclick]"),
  includeShadow: z.boolean().optional().default(false),
});

export type BrowserXpathScanParams = z.infer<typeof browserXpathScanParams>;

export function createBrowserXpathScanTool(): ToolDefinition<BrowserXpathScanParams> {
  const tool: any = {
    name: 'browser_xpath_scan',
    description:
      'Scan interactive elements on a page and generate Stagehand-style XPaths. Returns { ok, xpaths, items, meta }. Useful for discovering clickable elements, inputs, and interactive components on a webpage.',
    parameters: browserXpathScanParams,
    group: 'browser',
    async execute(params: BrowserXpathScanParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_xpathScan',
        params: {
          maxItems: params.maxItems,
          selector: params.selector,
          includeShadow: params.includeShadow,
        },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserXpathScanParams>;
}

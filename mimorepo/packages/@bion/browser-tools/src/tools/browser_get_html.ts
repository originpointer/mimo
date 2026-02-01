import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserGetHtmlParams = z.object({
  xpath: z.string(),
  maxChars: z.number().min(1).optional().default(200000),
});

export type BrowserGetHtmlParams = z.infer<typeof browserGetHtmlParams>;

export function createBrowserGetHtmlTool(): ToolDefinition<BrowserGetHtmlParams> {
  const tool: any = {
    name: 'browser_get_html',
    description: 'Extract innerHTML from elements matching an XPath selector. Returns the HTML content of matched elements, useful for scraping structured content or verifying element state.',
    parameters: browserGetHtmlParams,
    group: 'browser',
    async execute(params: BrowserGetHtmlParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_xpathGetHtml',
        params: {
          xpath: params.xpath,
          maxChars: params.maxChars,
        },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserGetHtmlParams>;
}

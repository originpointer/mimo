import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserJsonCommonXpathParams = z.object({
  keyValues: z.record(z.string()),
  maxHitsPerKey: z.number().min(1).optional().default(20),
  maxElementsScanned: z.number().min(1).optional().default(12000),
  caseSensitive: z.boolean().optional().default(false),
  includeShadow: z.boolean().optional().default(false),
});

export type BrowserJsonCommonXpathParams = z.infer<typeof browserJsonCommonXpathParams>;

export function createBrowserJsonCommonXpathTool(): ToolDefinition<BrowserJsonCommonXpathParams> {
  const tool: any = {
    name: 'browser_json_common_xpath',
    description: 'Find the minimal common ancestor XPath for multiple text patterns on a page. Useful for locating containers that hold related content like structured data or form fields.',
    parameters: browserJsonCommonXpathParams,
    group: 'browser',
    async execute(params: BrowserJsonCommonXpathParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_jsonCommonXpathFind',
        params: {
          keyValues: params.keyValues,
          maxHitsPerKey: params.maxHitsPerKey,
          maxElementsScanned: params.maxElementsScanned,
          caseSensitive: params.caseSensitive,
          includeShadow: params.includeShadow,
        },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserJsonCommonXpathParams>;
}

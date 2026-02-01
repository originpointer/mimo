import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserResumeValidateParams = z.object({
  xpathData: z.record(z.unknown()),
});

export type BrowserResumeValidateParams = z.infer<typeof browserResumeValidateParams>;

export function createBrowserResumeValidateTool(): ToolDefinition<BrowserResumeValidateParams> {
  const tool: any = {
    name: 'browser_resume_validate',
    description: 'Validate generated XPaths against actual page elements. Tests each XPath for match count and returns validation results, useful for verifying selectors before scraping.',
    parameters: browserResumeValidateParams,
    group: 'browser',
    async execute(params: BrowserResumeValidateParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_resumeXpathValidate',
        params: {
          xpathData: params.xpathData,
        },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserResumeValidateParams>;
}

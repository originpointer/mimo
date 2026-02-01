import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserResumeExtractParams = z.object({
  maxBlocks: z.number().min(1).optional().default(60),
  minTextLen: z.number().min(1).optional().default(80),
  maxTextLen: z.number().min(1).optional().default(2000),
  includeShadow: z.boolean().optional().default(false),
  noiseSelectors: z.string().optional().default("header,nav,footer,aside,[role=banner],[role=navigation]"),
  noiseClassIdRegex: z.string().optional().default("nav|menu|footer|header|sidebar|toolbar|pagination|breadcrumb|ads|comment"),
});

export type BrowserResumeExtractParams = z.infer<typeof browserResumeExtractParams>;

export function createBrowserResumeExtractTool(): ToolDefinition<BrowserResumeExtractParams> {
  const tool: any = {
    name: 'browser_resume_extract',
    description: 'Extract structured text blocks from resume/CV pages. Useful for parsing professional profiles, candidate information, and employment history from web pages.',
    parameters: browserResumeExtractParams,
    group: 'browser',
    async execute(params: BrowserResumeExtractParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();
      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_resumeBlocksExtract',
        params: {
          maxBlocks: params.maxBlocks,
          minTextLen: params.minTextLen,
          maxTextLen: params.maxTextLen,
          includeShadow: params.includeShadow,
          noiseSelectors: params.noiseSelectors,
          noiseClassIdRegex: params.noiseClassIdRegex,
        },
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserResumeExtractParams>;
}

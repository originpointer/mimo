import { z } from 'zod';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

import { getBrowserToolsConfig } from '../internal.js';

export const browserReadabilityExtractParams = z.object({
  /**
   * Maximum elements to parse (0 = no limit)
   */
  maxElemsToParse: z.number().int().min(0).optional(),
  /**
   * Number of top candidates to consider (default: 5)
   */
  nbTopCandidates: z.number().int().min(1).optional(),
  /**
   * Minimum character threshold for article content (default: 500)
   */
  charThreshold: z.number().int().min(0).optional(),
  /**
   * Whether to preserve class attributes (default: false)
   */
  keepClasses: z.boolean().optional(),
  /**
   * Classes to preserve during cleanup
   */
  classesToPreserve: z.array(z.string()).optional(),
  /**
   * Output format: 'html', 'text', or 'both' (default: 'both')
   */
  format: z.enum(['html', 'text', 'both']).optional(),
  /**
   * Maximum characters for text content (0 = no limit, default: 0)
   */
  maxChars: z.number().int().min(0).optional(),
  /**
   * Whether to include metadata like title, author, etc. (default: true)
   */
  includeMetadata: z.boolean().optional(),
});

export type BrowserReadabilityExtractParams = z.infer<typeof browserReadabilityExtractParams>;

export function createBrowserReadabilityExtractTool(): ToolDefinition<BrowserReadabilityExtractParams> {
  const tool: any = {
    name: 'browser_readability_extract',
    description: `Extract the main content from a web page using Mozilla's Readability algorithm. This is the RECOMMENDED FIRST STEP for page understanding.

IMPORTANT USAGE GUIDE:
1. USE THIS TOOL FIRST when you need to understand page content - it efficiently extracts only the main article/content
2. DO NOT use browser_get_content for initial page understanding - it loads the entire page which is slow and verbose
3. After extracting main content with this tool, use browser_json_common_xpath to find specific DOM containers for targeted data
4. Then use browser_get_html with XPath to extract specific elements quickly and stably

WHEN TO USE:
- Reading articles, blog posts, news stories
- Understanding the main content of any page
- Quick page overview without navigation noise
- Extracting structured article data (title, author, content)

RETURNS:
- Article title, byline, content (HTML), text content
- Metadata: site name, language, published time
- Boolean indicating if page appears to be article-like`,
    parameters: browserReadabilityExtractParams,
    group: 'browser',
    async execute(params: BrowserReadabilityExtractParams, context: ToolExecutionContext) {
      const cfg = getBrowserToolsConfig(context);
      const actionId = cfg.createActionId();

      // Build options object
      const options: any = {};
      if (params.maxElemsToParse !== undefined) options.maxElemsToParse = params.maxElemsToParse;
      if (params.nbTopCandidates !== undefined) options.nbTopCandidates = params.nbTopCandidates;
      if (params.charThreshold !== undefined) options.charThreshold = params.charThreshold;
      if (params.keepClasses !== undefined) options.keepClasses = params.keepClasses;
      if (params.classesToPreserve) options.classesToPreserve = params.classesToPreserve;

      const res = await cfg.transport.execute({
        sessionId: cfg.sessionId,
        clientId: cfg.clientId,
        actionId,
        actionName: 'browser_readabilityExtract',
        params: {
          options: Object.keys(options).length > 0 ? options : undefined,
          format: params.format,
          maxChars: params.maxChars,
          includeMetadata: params.includeMetadata,
        },
      });

      if (res.status === 'error') throw new Error(res.error);
      return res.observation ?? null;
    },
  };
  return tool as ToolDefinition<BrowserReadabilityExtractParams>;
}

import type { ToolDefinition } from '@mimo/agent-core/types';
import {
  createBrowserClickTool,
  createBrowserFillTool,
  createBrowserGetContentTool,
  createBrowserNavigateTool,
  createBrowserScreenshotTool,
  createBrowserSessionStartTool,
  createBrowserSessionStopTool,
  createBrowserXpathScanTool,
  createBrowserJsonCommonXpathTool,
  createBrowserXpathMarkTool,
  createBrowserGetHtmlTool,
  createBrowserResumeExtractTool,
  createBrowserResumeValidateTool,
  createBrowserTabGroupCreateTool,
  createBrowserTabGroupsQueryTool,
  createBrowserWindowFocusTool,
  createBrowserCdpClickTool,
} from './tools/index.js';

/**
 * Minimal registry surface we need (compatible with @mimo/agent-tools ToolRegistry).
 */
export type ToolRegistryLike = {
  register: (tool: ToolDefinition<any>) => void;
};

/**
 * Return all browser-related tools provided by this package.
 * Tools are intentionally produced lazily by callers (Phase1+ will add tool factories).
 */
export function createBrowserTools(): ToolDefinition<any>[] {
  return [
    createBrowserSessionStartTool(),
    createBrowserSessionStopTool(),
    createBrowserNavigateTool(),
    createBrowserGetContentTool(),
    createBrowserClickTool(),
    createBrowserFillTool(),
    createBrowserScreenshotTool(),
    createBrowserXpathScanTool(),
    createBrowserJsonCommonXpathTool(),
    createBrowserXpathMarkTool(),
    createBrowserGetHtmlTool(),
    createBrowserResumeExtractTool(),
    createBrowserResumeValidateTool(),
    createBrowserTabGroupCreateTool(),
    createBrowserTabGroupsQueryTool(),
    createBrowserWindowFocusTool(),
    createBrowserCdpClickTool(),
  ];
}

export function registerBrowserTools(registry: ToolRegistryLike): void {
  for (const tool of createBrowserTools()) {
    registry.register(tool);
  }
}


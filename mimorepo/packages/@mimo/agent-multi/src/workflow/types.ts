import { z } from 'zod';
import type { ILLMClient } from '@mimo/agent-core';
import type { IPage } from '@mimo/agent-cache';
import type { AgentCache } from '@mimo/agent-cache';
import type { ToolRegistry } from '@mimo/agent-tools';
import type { ToolExecutor } from '@mimo/agent-tools/executor';
import type { ToolExecutionContext } from '@mimo/agent-core/types';
import type { PromptManager } from '@mimo/agent-context';
import type { MessageManager, SensitiveDataFilter } from '@mimo/agent-context';

export const WorkflowPlanStepSchema = z
  .object({
    action: z
      .object({
        type: z.enum(['goto', 'type', 'click', 'evaluate', 'screenshot', 'wait']),
        url: z.string().optional(),
        text: z.string().optional(),
        code: z.string().optional(),
        duration: z.number().optional(),
      })
      .strict(),
    selector: z.string().optional(),
  })
  .strict();

export const WorkflowPlanSchema = z
  .object({
    steps: z.array(WorkflowPlanStepSchema).min(1),
  })
  .strict();

export type WorkflowPlanStep = z.infer<typeof WorkflowPlanStepSchema>;
export type WorkflowPlan = z.infer<typeof WorkflowPlanSchema>;

export interface WorkflowAgentConfig {
  id: string;
  model: string;

  llm: ILLMClient;

  registry: ToolRegistry;
  executor: ToolExecutor;
  toolContext: ToolExecutionContext;

  cache?: AgentCache;
  cacheNamespace?: string;

  promptManager?: PromptManager;
  messageManager?: MessageManager;
  sensitiveDataFilter?: SensitiveDataFilter;

  maxSteps?: number;
  promptTemplate?: 'default' | 'agent' | 'browser' | 'coder' | 'multimodal';
  customSystemPrompt?: string;
}

export interface WorkflowAgentExecuteOptions {
  instruction: string;
  startUrl: string;
  page: IPage;

  /** If true and cache is configured, prefer replay before LLM+tools. */
  enableCache?: boolean;

  /** If provided, values will be redacted in stored history. */
  sensitiveData?: Map<string, unknown>;
}


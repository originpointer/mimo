import { z } from 'zod';
import { PromptManager, MessageManager, SensitiveDataFilter } from '@mimo/agent-context';
import { AgentCache, type CachedAgentExecution, type AgentReplayStep } from '@mimo/agent-cache';
import { AgentStatus, MessageRole, type AgentResult, type AgentAction, type BaseMessage } from '@mimo/agent-core/types';
import type { IAgent } from '@mimo/agent-core/interfaces';

import type { WorkflowStep, WorkflowResult } from '@mimo/agent-core/types';
import type { ToolDefinition } from '@mimo/agent-core/types';

import type { WorkflowAgentConfig, WorkflowAgentExecuteOptions, WorkflowPlan } from './types.js';
import { WorkflowPlanSchema } from './types.js';

function now(): number {
  return Date.now();
}

type ToolParams =
  | { url: string }
  | { selector: string }
  | { selector: string; text: string }
  | { code: string }
  | { ms: number }
  | Record<string, unknown>;

function stepToToolCall(step: WorkflowPlan['steps'][number]): { toolName: string; params: ToolParams } {
  switch (step.action.type) {
    case 'goto':
      return { toolName: 'goto', params: { url: step.action.url ?? '' } };
    case 'click':
      return { toolName: 'click', params: { selector: step.selector ?? '' } };
    case 'type':
      return { toolName: 'type', params: { selector: step.selector ?? '', text: step.action.text ?? '' } };
    case 'evaluate':
      return { toolName: 'evaluate', params: { code: step.action.code ?? '' } };
    case 'screenshot':
      return { toolName: 'screenshot', params: {} };
    case 'wait':
      return { toolName: 'wait', params: { ms: step.action.duration ?? 0 } };
    default:
      return { toolName: step.action.type, params: {} };
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Stage06 WorkflowAgent
 *
 * - Single-agent orchestration for tool-based plans
 * - Integrates Stage03 tools + Stage04 cache/replay + Stage05 context
 * - Implements `IAgent` (agent-core) for a stable contract
 */
export class WorkflowAgent implements IAgent {
  readonly id: string;
  readonly config: import('@mimo/agent-core/types').AgentConfig;
  status: AgentStatus = AgentStatus.IDLE;

  private readonly llm: WorkflowAgentConfig['llm'];
  private readonly registry: WorkflowAgentConfig['registry'];
  private readonly executor: WorkflowAgentConfig['executor'];
  private readonly baseToolContext: WorkflowAgentConfig['toolContext'];
  private readonly cache: AgentCache | undefined;

  private readonly promptManager: PromptManager;
  private readonly messageManager: MessageManager;
  private readonly sensitiveDataFilter: SensitiveDataFilter;

  private readonly maxSteps: number;
  private readonly promptTemplate: 'default' | 'agent' | 'browser' | 'coder' | 'multimodal';
  private readonly customSystemPrompt: string | undefined;

  constructor(cfg: WorkflowAgentConfig) {
    this.id = cfg.id;
    this.config = {
      id: cfg.id,
      name: 'workflow-agent',
      model: cfg.model,
    };

    this.llm = cfg.llm;
    this.registry = cfg.registry;
    this.executor = cfg.executor;
    this.baseToolContext = cfg.toolContext;
    this.cache = cfg.cache ?? undefined;

    this.promptManager = cfg.promptManager ?? new PromptManager();
    this.messageManager = cfg.messageManager ?? new MessageManager({ maxHistoryItems: 50 });
    this.sensitiveDataFilter = cfg.sensitiveDataFilter ?? new SensitiveDataFilter();

    this.maxSteps = cfg.maxSteps ?? 25;
    this.promptTemplate = cfg.promptTemplate ?? 'default';
    this.customSystemPrompt = cfg.customSystemPrompt ?? undefined;
  }

  reset(): void {
    this.status = AgentStatus.IDLE;
    this.messageManager.clear();
  }

  async abort(): Promise<void> {
    // P0: no long-running internal loop besides tool execution.
    // Future: wire an AbortSignal through tool/llm calls.
    this.status = AgentStatus.STOPPED;
  }

  getHistory(): BaseMessage[] {
    return this.messageManager.getMessages();
  }

  /**
   * Execute a single instruction as a tool-based plan.
   * If cache is enabled/configured, prefer replay on repeat runs.
   */
  async execute(instruction: string, context?: WorkflowAgentExecuteOptions): Promise<AgentResult> {
    const startedAt = now();
    this.status = AgentStatus.RUNNING;

    const agentId = this.id;
    const page = context?.page;
    const startUrl = context?.startUrl ?? '';
    const enableCache = context?.enableCache ?? true;

    if (context?.sensitiveData) {
      this.sensitiveDataFilter.setSensitiveData(context.sensitiveData);
    }

    const toolNames = this.registry.getTools().map((t) => t.name);
    const cacheKey =
      this.cache && enableCache
        ? this.cache.buildKey(instruction, {
            instruction,
            startUrl,
            model: this.config.model,
            tools: toolNames,
          })
        : null;

    // Replay-first fast path.
    if (this.cache && enableCache && cacheKey && page) {
      try {
        const replayed = await this.cache.replay(
          cacheKey,
          { page },
          { waitTimeout: 100, skipScreenshots: true }
        );

        const actions: AgentAction[] = (replayed.actions ?? []).map((a: any) => ({
          type: String(a.type ?? 'replay'),
          description: safeStringify(a),
          params: a,
          result: a,
          timestamp: now(),
        }));

        this.status = AgentStatus.IDLE;
        const out: AgentResult = {
          agentId,
          success: replayed.success === true,
          actions,
          duration: now() - startedAt,
        };
        if (replayed.error) out.error = replayed.error;
        return out;
      } catch {
        // Cache miss: proceed to LLM + tools.
      }
    }

    const modelCaps: Parameters<PromptManager['buildSystemPrompt']>[0]['modelCaps'] = {
      supportsCaching: this.llm.capabilities.supportsCaching,
      supportsThinking: this.llm.capabilities.supportsThinking,
      ...(this.llm.capabilities.requiresLargePrompt === undefined
        ? {}
        : { requiresLargePrompt: this.llm.capabilities.requiresLargePrompt }),
    };

    const systemPrompt = await this.promptManager.buildSystemPrompt({
      template: this.promptTemplate,
      modelCaps,
      context: {
        instruction,
        startUrl,
        tools: toolNames,
      },
      ...(this.customSystemPrompt ? { customPrompt: this.customSystemPrompt } : {}),
    });

    const baseMessages: BaseMessage[] = [
      { role: MessageRole.SYSTEM, content: systemPrompt, timestamp: now() },
      {
        role: MessageRole.USER,
        content: [
          'Return a JSON plan that can be executed with tools.',
          'Constraints:',
          '- Output MUST be valid JSON.',
          '- Tools available are exactly these names: ' + toolNames.join(', '),
          '- Use action types: goto, type, click, evaluate (optionally screenshot, wait).',
          `- The task instruction is: ${instruction}`,
          `- startUrl is: ${startUrl}`,
          '',
          'Output shape:',
          '{"steps":[{"action":{"type":"goto","url":"URL"}},{"action":{"type":"type","text":"TEXT"},"selector":"#q"},{"action":{"type":"click"},"selector":"#submit"},{"action":{"type":"evaluate","code":"2 + 3"}}]}',
        ].join('\n'),
        timestamp: now(),
      },
    ];

    // Store filtered history (avoid leaking secrets).
    this.messageManager.addMessages(this.sensitiveDataFilter.filterMessages(baseMessages));

    const completion = await this.llm.complete<WorkflowPlan>({
      model: this.config.model,
      messages: baseMessages,
      temperature: 0,
      maxTokens: 800,
      responseModel: WorkflowPlanSchema as unknown as z.ZodType<WorkflowPlan>,
    });

    const plan: WorkflowPlan = completion.structuredData
      ? WorkflowPlanSchema.parse(completion.structuredData)
      : WorkflowPlanSchema.parse(JSON.parse(completion.content));

    const toolContext = {
      ...this.baseToolContext,
      config: {
        ...(this.baseToolContext.config ?? {}),
        page,
      },
    };

    const actions: AgentAction[] = [];
    const replaySteps: AgentReplayStep[] = [];

    for (let i = 0; i < plan.steps.length && i < this.maxSteps; i++) {
      const step = plan.steps[i];
      if (!step) continue;

      const { toolName, params } = stepToToolCall(step);
      const tool: ToolDefinition | null = this.registry.getTool(toolName);
      if (!tool) {
        this.status = AgentStatus.ERROR;
        return {
          agentId,
          success: false,
          actions,
          error: `Tool not registered: ${toolName}`,
          duration: now() - startedAt,
        };
      }

      const exec = await this.executor.execute(tool, params, toolContext, {
        timeout: 10_000,
        retries: 0,
      });

      actions.push({
        type: toolName,
        description: safeStringify(params),
        params,
        result: exec,
        timestamp: now(),
      });

      // Persist a replay-compatible step (Stage04).
      replaySteps.push({
        action: step.action,
        ...(step.selector ? { selector: step.selector } : {}),
        result: exec.result,
      });

      // Store tool result in history (filtered).
      this.messageManager.addMessage(
        this.sensitiveDataFilter.filterMessage({
          role: MessageRole.TOOL,
          content: safeStringify({
            tool: toolName,
            success: exec.success,
            result: exec.result,
            error: exec.error,
          }),
          toolCallId: exec.toolCall.id,
          timestamp: now(),
        })
      );

      if (!exec.success) {
        this.status = AgentStatus.ERROR;
        return {
          agentId,
          success: false,
          actions,
          error: exec.error ?? `Tool failed: ${toolName}`,
          duration: now() - startedAt,
        };
      }
    }

    // Save to cache for replay.
    if (this.cache && enableCache && cacheKey) {
      const cached: CachedAgentExecution = {
        version: 1,
        key: cacheKey,
        instruction,
        startUrl,
        options: {
          instruction,
          startUrl,
          model: this.config.model,
          tools: toolNames,
        },
        configSignature: `agent-multi:${this.config.model}`,
        steps: replaySteps,
        result: { success: true, actions: replaySteps.map(s => s.action) },
        timestamp: now(),
      };
      await this.cache.save(cacheKey, cached);
    }

    this.status = AgentStatus.IDLE;
    return {
      agentId,
      success: true,
      actions,
      usage: completion.usage,
      duration: now() - startedAt,
    };
  }

  /**
   * Minimal WorkflowStep orchestration (P0: topo-sort + serial execution)
   */
  async runWorkflow(steps: WorkflowStep[]): Promise<WorkflowResult> {
    const startedAt = now();
    const results = new Map<string, AgentResult>();

    const ordered = topoSort(steps);
    for (const step of ordered) {
      const res = await this.execute(step.task, step.context as any);
      results.set(step.id, res);
      if (!res.success) {
        return {
          success: false,
          stepResults: results,
          duration: now() - startedAt,
          output: undefined,
        };
      }
    }

    return {
      success: true,
      stepResults: results,
      duration: now() - startedAt,
      output: undefined,
    };
  }
}

function topoSort(steps: WorkflowStep[]): WorkflowStep[] {
  const byId = new Map<string, WorkflowStep>();
  for (const s of steps) byId.set(s.id, s);

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const out: WorkflowStep[] = [];

  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      // Cycle: fall back to insertion order (best-effort).
      return;
    }
    visiting.add(id);
    const step = byId.get(id);
    if (step) {
      for (const dep of step.dependencies ?? []) {
        if (byId.has(dep)) visit(dep);
      }
      out.push(step);
    }
    visiting.delete(id);
    visited.add(id);
  };

  for (const s of steps) visit(s.id);
  return out;
}


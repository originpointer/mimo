import { PromptManager, MessageManager, SensitiveDataFilter } from '@mimo/agent-context';
import { AgentStatus, MessageRole, type AgentResult, type BaseMessage } from '@mimo/agent-core/types';
import type { IAgent } from '@mimo/agent-core/interfaces';

import type { ChatAgentConfig, ChatAgentExecuteOptions } from './types.js';

function now(): number {
  return Date.now();
}

/**
 * ChatAgent (Stage06)
 *
 * A minimal IAgent implementation for basic chat:
 * - LLM completion (no tools, no cache)
 * - System prompt templates
 * - Message history
 * - Sensitive data redaction
 */
export class ChatAgent implements IAgent {
  readonly id: string;
  readonly config: import('@mimo/agent-core/types').AgentConfig;
  status: AgentStatus = AgentStatus.IDLE;

  private readonly llm: ChatAgentConfig['llm'];
  private readonly promptManager: PromptManager;
  private readonly messageManager: MessageManager;
  private readonly sensitiveDataFilter: SensitiveDataFilter;

  private readonly promptTemplate: 'default' | 'agent' | 'browser' | 'coder' | 'multimodal';
  private readonly customSystemPrompt: string | undefined;

  constructor(cfg: ChatAgentConfig) {
    this.id = cfg.id;
    this.config = {
      id: cfg.id,
      name: 'chat-agent',
      model: cfg.model,
    };

    this.llm = cfg.llm;
    this.promptManager = cfg.promptManager ?? new PromptManager();
    this.messageManager = cfg.messageManager ?? new MessageManager({ maxHistoryItems: 50 });
    this.sensitiveDataFilter = cfg.sensitiveDataFilter ?? new SensitiveDataFilter();

    this.promptTemplate = cfg.promptTemplate ?? 'default';
    this.customSystemPrompt = cfg.customSystemPrompt ?? undefined;
  }

  reset(): void {
    this.status = AgentStatus.IDLE;
    this.messageManager.clear();
  }

  async abort(): Promise<void> {
    // P0: no internal cancellable loop.
    this.status = AgentStatus.STOPPED;
  }

  getHistory(): BaseMessage[] {
    return this.messageManager.getMessages();
  }

  async execute(task: string, context?: ChatAgentExecuteOptions): Promise<AgentResult> {
    const startedAt = now();
    this.status = AgentStatus.RUNNING;

    if (context?.sensitiveData) {
      this.sensitiveDataFilter.setSensitiveData(context.sensitiveData);
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
      context: {},
      ...(this.customSystemPrompt ? { customPrompt: this.customSystemPrompt } : {}),
    });

    const messages: BaseMessage[] = [
      { role: MessageRole.SYSTEM, content: systemPrompt, timestamp: now() },
      ...this.messageManager.getMessages(),
      { role: MessageRole.USER, content: task, timestamp: now() },
    ];

    // Store filtered messages
    this.messageManager.addMessage(
      this.sensitiveDataFilter.filterMessage(messages[messages.length - 1]!)
    );

    const res = await this.llm.complete({
      model: this.config.model,
      messages: this.sensitiveDataFilter.filterMessages(messages),
      temperature: 0.2,
      maxTokens: 800,
    });

    const assistant: BaseMessage = {
      role: MessageRole.ASSISTANT,
      content: res.content,
      timestamp: now(),
    };
    this.messageManager.addMessage(this.sensitiveDataFilter.filterMessage(assistant));

    this.status = AgentStatus.IDLE;
    return {
      agentId: this.id,
      success: true,
      actions: [
        {
          type: 'chat',
          description: 'LLM chat completion',
          params: { task },
          result: { content: res.content },
          timestamp: now(),
        },
      ],
      output: res.content,
      usage: res.usage,
      duration: now() - startedAt,
    };
  }

  async runWorkflow(steps: import('@mimo/agent-core/types').WorkflowStep[]): Promise<import('@mimo/agent-core/types').WorkflowResult> {
    // For chat-only agent, treat each step.task as a chat turn.
    const startedAt = now();
    const results = new Map<string, AgentResult>();

    for (const step of steps) {
      const res = await this.execute(step.task, step.context as any);
      results.set(step.id, res);
      if (!res.success) {
        return { success: false, stepResults: results, duration: now() - startedAt };
      }
    }

    return { success: true, stepResults: results, duration: now() - startedAt };
  }
}


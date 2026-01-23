/**
 * @mimo/lib/agent
 *
 * MimoAgent - Intelligent agent for multi-step browser automation tasks
 */

import { v4 as uuidv4 } from 'uuid';
import type { MimoBus } from '@mimo/bus';
import type { LLMProvider } from '@mimo/llm';
import { HubCommandType } from '@mimo/types';
import type {
  AgentConfig,
  AgentExecuteOptions,
  AgentResult,
  AgentAction,
  AgentUsage,
  AgentStreamEvent,
} from '@mimo/types';

/**
 * MimoAgent errors
 */
export class MimoAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MimoAgentError';
  }
}

export class MimoAgentTimeoutError extends MimoAgentError {
  constructor(message: string, public timeout: number) {
    super(message);
    this.name = 'MimoAgentTimeoutError';
  }
}

export class MimoAgentMaxStepsError extends MimoAgentError {
  constructor(message: string, public maxSteps: number) {
    super(message);
    this.name = 'MimoAgentMaxStepsError';
  }
}

export class MimoAgentExecutionError extends MimoAgentError {
  constructor(message: string, public step: number, public action: string) {
    super(message);
    this.name = 'MimoAgentExecutionError';
  }
}

/**
 * MimoAgent - Intelligent agent for multi-step tasks
 */
export class MimoAgent {
  private model: string;
  private executionModel: string;
  private systemPrompt: string;
  private mode: 'dom' | 'hybrid' | 'cua';
  private cua: boolean;
  private integrations: string[];

  constructor(
    private bus: MimoBus,
    private llmProvider: LLMProvider,
    config: AgentConfig = {}
  ) {
    // Parse model configuration
    this.model = this.parseModel(config.model ?? 'openai/gpt-4.1-mini');
    this.executionModel = config.executionModel
      ? this.parseModel(config.executionModel)
      : this.model;

    this.systemPrompt = config.systemPrompt ?? this.getDefaultSystemPrompt();
    this.mode = config.mode ?? 'dom';
    this.cua = config.cua ?? false;
    this.integrations = config.integrations ?? [];
  }

  /**
   * Execute agent task
   */
  async execute(options: AgentExecuteOptions): Promise<AgentResult> {
    const maxSteps = options.maxSteps ?? 25;
    const actions: AgentAction[] = [];
    let totalUsage: AgentUsage = {
      inputTokens: 0,
      outputTokens: 0,
      inferenceTimeMs: 0,
    };

    try {
      for (let step = 0; step < maxSteps; step++) {
        // Observe current page state
        const observeResponse = await this.bus.send({
          id: uuidv4(),
          type: HubCommandType.AgentObserve,
          payload: {
            instruction: options.instruction,
            includeScreenshot: this.mode !== 'dom',
          },
          timestamp: Date.now(),
        });

        if (!observeResponse.success) {
          throw new MimoAgentExecutionError(
            observeResponse.error?.message ?? 'Observe failed',
            step,
            'observe'
          );
        }

        // Use LLM to decide next action
        const llmClient = this.llmProvider.getClient(this.executionModel);
        const startTime = Date.now();

        const decision = await llmClient.chatCompletion([
          { role: 'system', content: this.systemPrompt },
          {
            role: 'user',
            content: `
Task: ${options.instruction}
Current page: ${observeResponse.data?.pageUrl}
Page content: ${observeResponse.data?.pageText}
Available actions: ${JSON.stringify(observeResponse.data?.actions)}

Decide the next action to complete the task. Respond with a JSON object containing:
- action: the action description
- reasoning: your reasoning process
- taskCompleted: true if the task is complete

Example response:
{
  "action": "click the login button",
  "reasoning": "The user needs to log in first, so I'll click the login button",
  "taskCompleted": false
}
            `.trim(),
          },
        ]);

        const inferenceTime = Date.now() - startTime;

        // Parse LLM response
        let decisionData: any;
        try {
          decisionData = JSON.parse(decision.content);
        } catch {
          decisionData = {
            action: decision.content,
            reasoning: '',
            taskCompleted: false,
          };
        }

        // Record action
        const agentAction: AgentAction = {
          type: 'action',
          reasoning: decisionData.reasoning,
          taskCompleted: decisionData.taskCompleted ?? false,
          action: decisionData.action,
          timeMs: inferenceTime,
          pageText: observeResponse.data?.pageText,
          pageUrl: observeResponse.data?.pageUrl,
          instruction: options.instruction,
        };

        actions.push(agentAction);

        // Update usage
        totalUsage.inputTokens += decision.usage.inputTokens;
        totalUsage.outputTokens += decision.usage.outputTokens;
        totalUsage.inferenceTimeMs += inferenceTime;

        // Check if task completed
        if (decisionData.taskCompleted) {
          return {
            success: true,
            message: 'Task completed successfully',
            actions,
            completed: true,
            usage: totalUsage,
          };
        }

        // Execute the action
        const actionResponse = await this.bus.send({
          id: uuidv4(),
          type: HubCommandType.AgentStep,
          payload: {
            stepNumber: step,
            action: decisionData.action,
            context: {
              pageUrl: observeResponse.data?.pageUrl,
              previousActions: actions.map(a => a.action),
              remainingSteps: maxSteps - step - 1,
            },
          },
          timestamp: Date.now(),
        });

        if (!actionResponse.success) {
          throw new MimoAgentExecutionError(
            actionResponse.error?.message ?? 'Action failed',
            step,
            decisionData.action
          );
        }
      }

      // Max steps reached
      throw new MimoAgentMaxStepsError(
        'Agent reached maximum steps without completing task',
        maxSteps
      );
    } catch (error) {
      if (error instanceof MimoAgentError) {
        throw error;
      }
      throw new MimoAgentError(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Stream execute agent task
   */
  async *streamExecute(
    options: AgentExecuteOptions
  ): AsyncGenerator<AgentStreamEvent> {
    yield { type: 'start' };

    try {
      const result = await this.execute(options);
      yield { type: 'finish', data: { result } };
    } catch (error) {
      yield {
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Set system prompt
   */
  withSystemPrompt(prompt: string): this {
    this.systemPrompt = prompt;
    return this;
  }

  /**
   * Set model
   */
  withModel(model: string): this {
    this.model = model;
    return this;
  }

  /**
   * Set integrations
   */
  withIntegrations(integrations: string[]): this {
    this.integrations = integrations;
    return this;
  }

  /**
   * Parse model configuration
   */
  private parseModel(model: string): string {
    if (typeof model === 'string') {
      return model;
    }
    return (model as any).modelName;
  }

  /**
   * Get default system prompt
   */
  private getDefaultSystemPrompt(): string {
    return `You are an intelligent browser automation agent. Your goal is to complete the user's task by analyzing the current page state and taking appropriate actions.

Guidelines:
- Always observe the current page before taking action
- Reason about each action before executing it
- Mark the task as complete only when truly finished
- Be concise and efficient in your actions
- If you encounter an error, try to recover or report the issue clearly`;
  }
}

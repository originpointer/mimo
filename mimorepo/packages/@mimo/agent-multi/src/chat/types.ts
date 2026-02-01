import type { ILLMClient } from '@mimo/agent-core';
import type { PromptManager, MessageManager, SensitiveDataFilter } from '@mimo/agent-context';

export interface ChatAgentConfig {
  id: string;
  model: string;
  llm: ILLMClient;

  promptManager?: PromptManager;
  messageManager?: MessageManager;
  sensitiveDataFilter?: SensitiveDataFilter;

  promptTemplate?: 'default' | 'agent' | 'browser' | 'coder' | 'multimodal';
  customSystemPrompt?: string;
}

export interface ChatAgentExecuteOptions {
  /** If provided, values will be redacted in stored history. */
  sensitiveData?: Map<string, unknown>;
}


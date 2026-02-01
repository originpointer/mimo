export type PromptTemplate =
  | 'default'
  | 'coder'
  | 'browser'
  | 'agent'
  | 'multimodal';

export interface TemplateLoadOptions {
  /** Prefer a variant suffix if available, e.g. "default_thinking.md" */
  variant?: 'thinking' | 'cached';
}


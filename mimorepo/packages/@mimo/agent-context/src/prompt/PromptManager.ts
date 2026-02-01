import type { ModelCapability } from '@mimo/agent-core';
import type { PromptTemplate } from './types.js';
import { TemplateLoader } from './TemplateLoader.js';

export class PromptManager {
  private loader: TemplateLoader;

  constructor(options?: { loader?: TemplateLoader }) {
    this.loader = options?.loader ?? new TemplateLoader();
  }

  async loadTemplate(
    template: PromptTemplate,
    modelCaps?: Pick<ModelCapability, 'supportsCaching' | 'supportsThinking' | 'requiresLargePrompt'>
  ): Promise<string> {
    const variant =
      modelCaps?.supportsCaching && modelCaps?.requiresLargePrompt
        ? 'cached'
        : modelCaps?.supportsThinking
          ? 'thinking'
          : undefined;

    return this.loader.load(template, variant ? { variant } : undefined);
  }

  async buildSystemPrompt(options: {
    template: PromptTemplate;
    modelCaps?: Pick<ModelCapability, 'supportsCaching' | 'supportsThinking' | 'requiresLargePrompt'>;
    context?: Record<string, unknown>;
    customPrompt?: string;
  }): Promise<string> {
    const base = await this.loadTemplate(options.template, options.modelCaps);
    const rendered = this.replaceTemplateVariables(base, options.context ?? {});
    return options.customPrompt ? `${rendered}\n\n${options.customPrompt}` : rendered;
  }

  replaceTemplateVariables(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => {
      const value = context[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    });
  }
}


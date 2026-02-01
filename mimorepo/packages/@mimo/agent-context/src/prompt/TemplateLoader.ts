import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { PromptTemplate, TemplateLoadOptions } from './types.js';

export class TemplateLoader {
  private templatesDir: string;

  constructor(options?: { templatesDir?: string }) {
    if (options?.templatesDir) {
      this.templatesDir = options.templatesDir;
      return;
    }
    const here = dirname(fileURLToPath(import.meta.url));
    this.templatesDir = join(here, 'templates');
  }

  async load(template: PromptTemplate, options?: TemplateLoadOptions): Promise<string> {
    const candidates: string[] = [];

    if (options?.variant) {
      candidates.push(`${template}_${options.variant}.md`);
    }
    candidates.push(`${template}.md`);
    if (template !== 'default') candidates.push('default.md');

    let lastError: unknown;
    for (const filename of candidates) {
      try {
        return await readFile(join(this.templatesDir, filename), 'utf-8');
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Failed to load prompt template');
  }
}


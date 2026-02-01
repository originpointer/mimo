import { describe, it, expect } from 'vitest';
import { PromptManager } from './PromptManager.js';

describe('PromptManager', () => {
  it('replaces template variables', () => {
    const mgr = new PromptManager();
    const out = mgr.replaceTemplateVariables('Hello {{name}}', { name: 'world' });
    expect(out).toBe('Hello world');
  });

  it('falls back to empty string for missing variables', () => {
    const mgr = new PromptManager();
    const out = mgr.replaceTemplateVariables('Hello {{missing}}', {});
    expect(out).toBe('Hello ');
  });

  it('loads a template', async () => {
    const mgr = new PromptManager();
    const text = await mgr.loadTemplate('default', { supportsCaching: false, supportsThinking: false });
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });
});


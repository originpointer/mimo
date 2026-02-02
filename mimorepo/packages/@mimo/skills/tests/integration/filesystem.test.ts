/**
 * Integration tests for filesystem discovery.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { FileSystemDiscovery } from '../../src/discovery/index.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Skill } from '../../src/types.js';

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/skills');

describe('FileSystemDiscovery', () => {
  let skills: Skill[];

  beforeAll(async () => {
    skills = await FileSystemDiscovery.discover(FIXTURES_DIR, {
      validate: false
    });
  });

  it('should discover all skills in fixtures directory', () => {
    expect(skills.length).toBeGreaterThanOrEqual(3);
  });

  it('should find arxiv-search skill', () => {
    const arxivSkill = skills.find(s => s.name === 'arxiv-search');
    expect(arxivSkill).toBeDefined();
    expect(arxivSkill?.description).toBe('Search arXiv for research papers in physics, math, and computer science');
  });

  it('should find web-research skill', () => {
    const webSkill = skills.find(s => s.name === 'web-research');
    expect(webSkill).toBeDefined();
    expect(webSkill?.description).toBe('Conduct comprehensive web research with structured methodology');
  });

  it('should find data-analyzer skill', () => {
    const dataSkill = skills.find(s => s.name === 'data-analyzer');
    expect(dataSkill).toBeDefined();
    expect(dataSkill?.description).toBe('Analyze CSV data files and generate statistics');
  });

  it('should parse skill content correctly', () => {
    const arxivSkill = skills.find(s => s.name === 'arxiv-search');
    expect(arxivSkill?.content).toContain('# arXiv Search Skill');
    expect(arxivSkill?.content).toContain('## When to Use');
  });

  it('should parse frontmatter metadata', () => {
    const arxivSkill = skills.find(s => s.name === 'arxiv-search');
    expect(arxivSkill?.metadata).toBeDefined();
    expect(arxivSkill?.metadata?.version).toBe('1.0.0');
  });

  it('should set uri to skill directory', () => {
    const arxivSkill = skills.find(s => s.name === 'arxiv-search');
    expect(arxivSkill?.uri).toBeDefined();
    expect(arxivSkill?.uri).toContain('arxiv-search');
  });
});

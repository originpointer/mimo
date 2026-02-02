# @mimo/skills

Progressive disclosure skills framework for AI agents with BM25-powered discovery.

## Overview

`@mimo/skills` is a TypeScript/Node.js implementation of [Anthropic's Agent Skills specification](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview). It enables modular skill definition with on-demand loading to minimize token usage, plus BM25 search for intelligent skill discovery.

## Features

- **🎯 Progressive Disclosure**: Load skills on-demand, reducing initial context
- **🔍 BM25 Search**: Full-text search using Orama with configurable relevance thresholds
- **📁 File-Based Skills**: Define skills as directories with SKILL.md files
- **🔧 Programmatic Skills**: Create skills using TypeScript decorators and builders
- **🔒 Secure**: Path traversal prevention, script timeouts, safe YAML parsing
- **📦 Type-Safe**: Full TypeScript support with Zod validation

## Installation

```bash
pnpm add @mimo/skills
```

## Quick Start

### File-Based Skills

Create a skill directory with a SKILL.md file:

```markdown
---
name: arxiv-search
description: Search arXiv for research papers
---

# arXiv Search Skill

Use this skill to find academic papers.
```

Then use the toolset:

```ts
import { SkillsToolset } from '@mimo/skills';

const toolset = new SkillsToolset({
  directories: ['./skills'],
  enableBM25: true
});

await toolset.initialize();

// Get system prompt with skills overview
const instructions = await toolset.getInstructions();

// Search for relevant skills
const results = await toolset.searchSkills('research papers');
```

### Programmatic Skills

```ts
import { createSkill } from '@mimo/skills';

const skill = createSkill('data-analyzer', 'Analyze data')
  .setContent('Instructions for data analysis...')
  .addResource('schema', schemaContent)
  .addScript('process', processFn, schema)
  .build();

const toolset = new SkillsToolset({
  skills: [skill]
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                         │
│                   SkillsToolset (5 tools)                    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Discovery Layer                           │
│          FileSystemDiscovery + OramaSearchManager            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       Type Layer                              │
│              Skill, SkillResource, SkillScript               │
└─────────────────────────────────────────────────────────────┘
```

## Five Core Tools

| Tool | Description |
|------|-------------|
| `listSkills()` | List all available skills |
| `loadSkill(name)` | Load full instructions for a skill |
| `readSkillResource(skillName, resourceName, args)` | Read resource files |
| `runSkillScript(skillName, scriptName, args)` | Execute scripts |
| `searchSkills(query, limit)` | BM25 search for skills |

## Progressive Disclosure Flow

1. **Discovery**: Agent receives skill names + descriptions in system prompt
2. **Search**: Agent uses `searchSkills()` to find relevant skills
3. **Load**: Agent calls `loadSkill()` for full instructions
4. **Execute**: Agent uses resources and scripts as needed

## BM25 Search

Enable BM25 search for intelligent skill discovery:

```ts
const toolset = new SkillsToolset({
  directories: ['./skills'],
  enableBM25: true,
  bm25Threshold: 0.3  // Filter low-relevance results
});

await toolset.initialize();

// Search returns ranked results
const results = await toolset.searchSkills('data analysis');
// [{ name: 'data-analyzer', description: '...', score: 0.89 }, ...]
```

**Search Configuration:**
- **Boost factors**: name=3x, description=2x, body=1x
- **Threshold**: Filter results by minimum relevance (0-1)
- **Limit**: Cap maximum results (default: 10)
- **Tokenizer**: Mandarin tokenizer for Chinese text

## SKILL.md Format

```yaml
---
name: my-skill
description: Brief description (max 1024 chars)
version: 1.0.0
---

# Skill Instructions

Detailed instructions here...
```

**Required fields:**
- `name`: Lowercase, hyphens, max 64 chars
- `description`: Brief summary, max 1024 chars

**Optional fields:**
- `version`, `license`, `author`, `tags`, etc.

## Directory Structure

```
my-skill/
├── SKILL.md          # Required: Instructions and metadata
├── scripts/          # Optional: Executable scripts
│   └── process.py
└── resources/        # Optional: Additional files
    ├── reference.md
    └── schema.json
```

## API Reference

### SkillsToolset

```ts
class SkillsToolset {
  constructor(options?: SkillsToolsetOptions);

  // Initialize and load skills from directories
  async initialize(): Promise<void>;

  // Get a specific skill
  getSkill(name: string): Skill;

  // Get all loaded skills
  getSkills(): Map<string, Skill>;

  // Tool methods
  async listSkills(): Promise<Record<string, string>>;
  async loadSkill(skillName: string): Promise<string>;
  async readSkillResource(skillName: string, resourceName: string, args?: Record<string, unknown>): Promise<string>;
  async runSkillScript(skillName: string, scriptName: string, args?: Record<string, unknown>): Promise<string>;
  async searchSkills(query: string, limit?: number): Promise<Array<{ name: string; description: string; score: number }>>;

  // Progressive disclosure
  async getInstructions(): Promise<string | null>;
}
```

### Skill Options

```ts
interface SkillsToolsetOptions {
  // Programmatic skills to include
  skills?: Skill[];

  // Directories to scan for skills
  directories?: string[];

  // Validate skill structure
  validate?: boolean;

  // Maximum discovery depth
  maxDepth?: number;

  // Enable BM25 search
  enableBM25?: boolean;

  // BM25 relevance threshold (0-1)
  bm25Threshold?: number;

  // Custom instruction template
  instructionTemplate?: string;

  // Tools to exclude
  excludeTools?: Set<string> | string[];
}
```

## License

MIT

## References

- [Anthropic Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [pydantic-ai-skills](https://github.com/pydantic-ai/pydantic-ai-skills) - Python reference implementation
- [Orama](https://oramasearch.com/) - Full-text search engine

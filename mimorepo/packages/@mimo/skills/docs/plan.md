Claude’s Plan
TypeScript Skills Framework Implementation Plan
Overview
Implement a TypeScript/Node.js version of the pydantic-ai-skills framework with BM25-powered skill discovery using @orama/orama, following the established monorepo patterns.

Target Location: /Users/sodaabe/codes/coding/mimo/mimorepo/packages/@mimo/skills

Reference Implementation: /Users/sodaabe/codes/coding/mimo/mimorepo/.sources/pydantic-ai-skills/

BM25 Reference: /Users/sodaabe/codes/coding/mimo/.refer/server/utils/skillsIndex/

Architecture

┌─────────────────────────────────────────────────────────────────┐
│                    Integration Layer                            │
│                   (toolset/ - ~500 lines)                       │
│  SkillsToolset with 4 core tools + BM25 search                 │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Discovery Layer                            │
│                  (discovery/ - ~400 lines)                      │
│  FileSystemDiscovery + OramaSearchManager (BM25)               │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        Type Layer                               │
│                     (types.ts - ~250 lines)                     │
│  Skill, SkillResource, SkillScript interfaces                  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Execution Layer                            │
│                  (execution/ - ~250 lines)                      │
│  LocalScriptExecutor, CallableScriptExecutor                   │
└─────────────────────────────────────────────────────────────────┘
Package Structure

packages/@mimo/skills/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── types.ts                    # Core interfaces & types
│   ├── constants.ts                # Name patterns, reserved words
│   ├── exceptions.ts               # Custom error classes
│   ├── validation.ts               # Validation utilities
│   │
│   ├── discovery/                  # Skill discovery
│   │   ├── FileSystemDiscovery.ts  # File system scanner
│   │   ├── OramaSearchManager.ts   # BM25 search with Orama
│   │   ├── FrontmatterParser.ts    # YAML frontmatter parser
│   │   └── index.ts
│   │
│   ├── skill/                      # Skill implementation
│   │   ├── Skill.ts                # Core Skill class
│   │   ├── SkillBuilder.ts         # Fluent API builder
│   │   ├── SkillDecorator.ts       # Decorator support
│   │   └── index.ts
│   │
│   ├── resources/                  # Resource types
│   │   ├── BaseSkillResource.ts    # Abstract base
│   │   ├── StaticSkillResource.ts  # Static content
│   │   ├── CallableSkillResource.ts # Dynamic content
│   │   ├── FileBasedSkillResource.ts # File-based
│   │   └── index.ts
│   │
│   ├── scripts/                    # Script types
│   │   ├── BaseSkillScript.ts      # Abstract base
│   │   ├── CallableSkillScript.ts  # Function-based
│   │   ├── FileBasedSkillScript.ts # File-based
│   │   └── index.ts
│   │
│   ├── execution/                  # Script execution
│   │   ├── LocalScriptExecutor.ts  # Node.js child_process
│   │   ├── CallableScriptExecutor.ts # Custom executors
│   │   └── index.ts
│   │
│   ├── toolset/                    # Agent integration
│   │   ├── SkillsToolset.ts        # Main toolset class
│   │   ├── tools/                  # Tool implementations
│   │   │   ├── listSkills.ts
│   │   │   ├── loadSkill.ts
│   │   │   ├── readSkillResource.ts
│   │   │   ├── runSkillScript.ts
│   │   │   └── searchSkills.ts     # BM25 search tool
│   │   └── index.ts
│   │
│   └── utils/                      # Utilities
│       ├── path.ts                 # Path utilities
│       ├── text.ts                # Text normalization
│       └── index.ts
│
├── tests/
│   ├── unit/                       # Unit tests
│   │   ├── validation.test.ts
│   │   ├── discovery.test.ts
│   │   ├── skill.test.ts
│   │   ├── resources.test.ts
│   │   ├── scripts.test.ts
│   │   ├── execution.test.ts
│   │   ├── toolset.test.ts
│   │   └── search.test.ts
│   │
│   ├── integration/                # Integration tests
│   │   ├── filesystem.test.ts
│   │   ├── programmatic.test.ts
│   │   ├── progressive-disclosure.test.ts
│   │   └── bm25-search.test.ts
│   │
│   └── fixtures/                   # Test fixtures
│       ├── skills/                 # Example skills
│       │   ├── arxiv-search/SKILL.md
│       │   ├── web-research/SKILL.md
│       │   └── data-analyzer/SKILL.md
│       └── schemas/                # Test schemas
│
├── docs/
│   ├── README.md                   # Package documentation
│   ├── api.md                      # API reference
│   └── examples.md                 # Usage examples
│
├── package.json
├── tsconfig.json
├── tsdown.config.ts
├── vitest.config.ts
└── README.md
Dependencies

{
  "name": "@mimo/skills",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.mjs",
  "types": "./dist/index.d.mts",
  "exports": {
    ".": {
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs"
    },
    "./toolset": {
      "types": "./dist/toolset/index.d.mts",
      "import": "./dist/toolset/index.mjs"
    }
  },
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown -w",
    "check-types": "tsc --noEmit",
    "test": "vitest --run",
    "test:watch": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "@mimo/agent-core": "workspace:*",
    "@mimo/types": "workspace:*",
    "@orama/orama": "^3.1.18",
    "@orama/highlight": "^0.1.9",
    "@orama/stopwords": "^3.1.18",
    "@orama/tokenizers": "^3.1.18",
    "yaml": "^2.7.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/node": "^20.17.0",
    "tsdown": "^0.3.0",
    "typescript": "^5.9.2",
    "vitest": "^3.0.7"
  }
}
Critical Files
1. /src/types.ts (~250 lines)
Core interfaces and types:


// Skill naming pattern
export const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const RESERVED_WORDS = new Set(['anthropic', 'claude']);
export const MAX_SKILL_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 1024;

// Skill name normalization
export function normalizeSkillName(name: string): string {
  const normalized = name.toLowerCase().replace(/_/g, '-');
  if (!SKILL_NAME_PATTERN.test(normalized)) {
    throw new SkillValidationError(`Invalid skill name: ${name}`);
  }
  if (normalized.length > MAX_SKILL_NAME_LENGTH) {
    throw new SkillValidationError(`Skill name exceeds ${MAX_SKILL_NAME_LENGTH} characters`);
  }
  return normalized;
}

// Core interfaces
export interface SkillResource {
  name: string;
  description?: string;
  content?: string;
  function?: CallableFunction;
  functionSchema?: FunctionSchema;
  uri?: string;
  load(ctx: any, args?: Record<string, unknown>): Promise<any>;
}

export interface SkillScript {
  name: string;
  description?: string;
  function?: CallableFunction;
  functionSchema?: FunctionSchema;
  uri?: string;
  skillName?: string;
  executor?: ScriptExecutor;
  run(ctx: any, args?: Record<string, unknown>): Promise<any>;
}

export interface Skill {
  name: string;
  description: string;
  content: string;
  license?: string;
  compatibility?: string;
  resources: SkillResource[];
  scripts: SkillScript[];
  uri?: string;
  metadata?: Record<string, unknown>;
}

export interface SkillDocument {
  id: string;
  name: string;
  description: string;
  body: string;
  uri?: string;
}

// Toolset interface
export interface SkillsToolsetOptions {
  skills?: Skill[];
  directories?: string[];
  validate?: boolean;
  maxDepth?: number;
  enableBM25?: boolean;
  bm25Threshold?: number;
  instructionTemplate?: string;
  excludeTools?: string[];
}
2. /src/discovery/OramaSearchManager.ts (~200 lines)
BM25 search using Orama:


import { create, insert, search, Orama } from '@orama/orama';
import { createTokenizer } from '@orama/tokenizers/mandarin';
import { stopwords as mandarinStopwords } from '@orama/stopwords/mandarin';
import type { Skill, SkillDocument } from '../types.js';

const SKILLS_SCHEMA = {
  id: 'string',
  name: 'string',
  description: 'string',
  body: 'string',
  uri: 'string'
} as const;

export type SkillsDB = Orama<typeof SKILLS_SCHEMA>;

export class OramaSearchManager {
  private db: SkillsDB | null = null;
  private skills: Map<string, Skill> = new Map();

  async buildIndex(skills: Map<string, Skill>): Promise<void> {
    this.skills = skills;
    this.db = create({
      schema: SKILLS_SCHEMA,
      components: {
        tokenizer: createTokenizer({
          language: 'mandarin',
          stopWords: mandarinStopwords
        })
      }
    });

    const docs: SkillDocument[] = Array.from(skills.values()).map(skill => ({
      id: skill.name,
      name: skill.name,
      description: skill.description,
      body: skill.content,
      uri: skill.uri || ''
    }));

    for (const doc of docs) {
      insert(this.db, doc);
    }
  }

  async search(query: string, options: {
    limit?: number;
    threshold?: number;
    boost?: { name?: number; description?: number };
  } = {}): Promise<Array<{ skill: Skill; score: number }>> {
    if (!this.db) {
      throw new Error('Search index not built. Call buildIndex() first.');
    }

    const { limit = 10, threshold = 0, boost = { name: 3, description: 2 } } = options;

    const results = await search(this.db, {
      term: query,
      properties: ['name', 'description', 'body'],
      boost,
      limit,
      threshold
    });

    return results.hits.map(hit => ({
      skill: this.skills.get(hit.document.id)!,
      score: hit.score
    }));
  }

  getSkills(): Map<string, Skill> {
    return this.skills;
  }
}
3. /src/toolset/SkillsToolset.ts (~500 lines)
Main toolset with 5 tools:


import { OramaSearchManager } from '../discovery/OramaSearchManager.js';

export class SkillsToolset {
  private skills: Map<string, Skill> = new Map();
  private searchManager: OramaSearchManager;
  private options: SkillsToolsetOptions;

  constructor(options: SkillsToolsetOptions = {}) {
    this.options = {
      validate: true,
      maxDepth: 3,
      enableBM25: false,
      bm25Threshold: 0.3,
      excludeTools: [],
      ...options
    };

    this.searchManager = new OramaSearchManager();

    this._initialize();
  }

  private async _initialize() {
    // Load skills from directories
    if (this.options.directories) {
      for (const dir of this.options.directories) {
        const discovered = await FileSystemDiscovery.discover(dir, {
          validate: this.options.validate,
          maxDepth: this.options.maxDepth
        });
        for (const skill of discovered) {
          this.skills.set(skill.name, skill);
        }
      }
    }

    // Add programmatic skills
    if (this.options.skills) {
      for (const skill of this.options.skills) {
        this.skills.set(skill.name, skill);
      }
    }

    // Build BM25 index if enabled
    if (this.options.enableBM25) {
      await this.searchManager.buildIndex(this.skills);
    }
  }

  // Tool 1: List all skills
  async listSkills(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const [name, skill] of this.skills) {
      result[name] = skill.description;
    }
    return result;
  }

  // Tool 2: Load full skill
  async loadSkill(skillName: string): Promise<string> {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new SkillNotFoundError(`Skill '${skillName}' not found`);
    }
    return this._formatSkill(skill);
  }

  // Tool 3: Read resource
  async readSkillResource(
    skillName: string,
    resourceName: string,
    args?: Record<string, unknown>
  ): Promise<string> {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new SkillNotFoundError(`Skill '${skillName}' not found`);
    }

    const resource = skill.resources.find(r => r.name === resourceName);
    if (!resource) {
      throw new SkillResourceNotFoundError(`Resource '${resourceName}' not found`);
    }

    return await resource.load(null, args);
  }

  // Tool 4: Run script
  async runSkillScript(
    skillName: string,
    scriptName: string,
    args?: Record<string, unknown>
  ): Promise<string> {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new SkillNotFoundError(`Skill '${skillName}' not found`);
    }

    const script = skill.scripts.find(s => s.name === scriptName);
    if (!script) {
      throw new SkillScriptNotFoundError(`Script '${scriptName}' not found`);
    }

    return await script.run(null, args);
  }

  // Tool 5: BM25 search
  async searchSkills(
    query: string,
    limit = 10
  ): Promise<Array<{ name: string; description: string; score: number }>> {
    const results = await this.searchManager.search(query, {
      limit,
      threshold: this.options.bm25Threshold
    });

    return results.map(({ skill, score }) => ({
      name: skill.name,
      description: skill.description,
      score: Math.round(score * 1000) / 1000
    }));
  }

  // Progressive disclosure
  async getInstructions(): Promise<string | null> {
    if (this.skills.size === 0) return null;

    const skillsList = Array.from(this.skills.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(s => `<skill><name>${s.name}</name><description>${s.description}</description></skill>`)
      .join('\n');

    return DEFAULT_INSTRUCTION_TEMPLATE.replace('{skills_list}', skillsList);
  }
}

const DEFAULT_INSTRUCTION_TEMPLATE = `You have access to a collection of skills.
<available_skills>
{skills_list}
</available_skills>

Use the searchSkills tool to find relevant skills, then use loadSkill to get full instructions.`;
4. /src/discovery/FileSystemDiscovery.ts (~150 lines)
File system discovery:


import { promises as fs } from 'fs';
import { join, relative, resolve } from 'path';
import { parse as parseYAML } from 'yaml';
import { FrontmatterParser } from './FrontmatterParser.js';
import type { Skill } from '../types.js';

export class FileSystemDiscovery {
  static async discover(
    rootDir: string,
    options: { validate?: boolean; maxDepth?: number } = {}
  ): Promise<Skill[]> {
    const { validate = true, maxDepth = 3 } = options;
    const skills: Skill[] = [];

    const skillFiles = await this._findSkillFiles(rootDir, maxDepth);

    for (const skillFile of skillFiles) {
      try {
        const skill = await this._loadSkillFromFile(skillFile);
        if (validate) {
          this._validateSkill(skill);
        }
        skills.push(skill);
      } catch (error) {
        console.warn(`Failed to load skill from ${skillFile}:`, error);
      }
    }

    return skills;
  }

  private static async _findSkillFiles(
    rootDir: string,
    maxDepth: number
  ): Promise<string[]> {
    const results: string[] = [];

    async function scanDir(dir: string, depth: number) {
      if (depth > maxDepth) return;

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanDir(fullPath, depth + 1);
        } else if (entry.name === 'SKILL.md') {
          results.push(fullPath);
        }
      }
    }

    await scanDir(rootDir, 0);
    return results;
  }

  private static async _loadSkillFromFile(filePath: string): Promise<Skill> {
    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter, body } = FrontmatterParser.parse(content);

    return {
      name: frontmatter.name,
      description: frontmatter.description || '',
      content: body,
      license: frontmatter.license,
      compatibility: frontmatter.compatibility,
      uri: resolve(filePath),
      resources: [],
      scripts: [],
      metadata: frontmatter
    };
  }

  private static _validateSkill(skill: Skill): void {
    // Name validation
    if (!skill.name || !SKILL_NAME_PATTERN.test(skill.name)) {
      throw new SkillValidationError(`Invalid skill name: ${skill.name}`);
    }
    if (skill.name.length > 64) {
      console.warn(`Skill name '${skill.name}' exceeds 64 characters`);
    }
    for (const reserved of RESERVED_WORDS) {
      if (skill.name.includes(reserved)) {
        console.warn(`Skill name '${skill.name}' contains reserved word '${reserved}'`);
      }
    }

    // Description validation
    if (skill.description.length > 1024) {
      console.warn(`Skill description exceeds 1024 characters`);
    }
  }
}
5. /src/execution/LocalScriptExecutor.ts (~100 lines)
Script execution with Node.js child_process:


import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

export class LocalScriptExecutor {
  constructor(
    private timeout = 30000,
    private pythonPath = process.env.PYTHON || 'python3'
  ) {}

  async execute(
    scriptPath: string,
    args: Record<string, unknown> = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const cmd = [this.pythonPath, scriptPath];

      // Convert args to CLI flags
      for (const [key, value] of Object.entries(args)) {
        if (typeof value === 'boolean') {
          if (value) cmd.push(`--${key}`);
        } else if (Array.isArray(value)) {
          for (const item of value) {
            cmd.push(`--${key}`, String(item));
          }
        } else if (value !== null && value !== undefined) {
          cmd.push(`--${key}`, String(value));
        }
      }

      let stdout = '';
      let stderr = '';
      let timer: NodeJS.Timeout;

      const proc = spawn(cmd[0], cmd.slice(1), {
        cwd: resolve(scriptPath, '..')
      });

      timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`Script execution timeout after ${this.timeout}ms`));
      }, this.timeout);

      proc.stdout.on('data', (data) => { stdout += data; });
      proc.stderr.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Script exited with code ${code}\n${stderr}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Failed to execute script: ${err.message}`));
      });
    });
  }
}
Build Configuration
/tsdown.config.ts

import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'esm',
  outDir: './dist',
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['@orama/orama', '@orama/highlight', '@orama/stopwords', '@orama/tokenizers']
});
/tsconfig.json

{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "references": [
    { "path": "../agent-core" },
    { "path": "../types" }
  ]
}
/vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['tests/fixtures/**']
    }
  }
});
Implementation Phases
Phase 1: Foundation (3-4 days)
Files:

src/types.ts - Core interfaces
src/exceptions.ts - Error classes
src/validation.ts - Validation utilities
src/constants.ts - Constants
tests/fixtures/skills/** - Test fixtures
vitest.config.ts - Test config
Goal: Establish type system and test infrastructure

Phase 2: Discovery Layer (5-6 days)
Files:

src/discovery/FrontmatterParser.ts - YAML parsing
src/discovery/FileSystemDiscovery.ts - File scanner
src/discovery/OramaSearchManager.ts - BM25 search
tests/unit/discovery.test.ts
tests/integration/filesystem.test.ts
tests/integration/bm25-search.test.ts
Goal: Implement skill discovery with BM25 search

Phase 3: Type Layer (4-5 days)
Files:

src/skill/Skill.ts - Core Skill class
src/skill/SkillBuilder.ts - Fluent API
src/skill/SkillDecorator.ts - Decorator support
src/resources/** - Resource implementations
src/scripts/** - Script implementations
tests/unit/skill.test.ts
Goal: Complete skill definition system

Phase 4: Execution Layer (3-4 days)
Files:

src/execution/LocalScriptExecutor.ts - subprocess execution
src/execution/CallableScriptExecutor.ts - custom executors
tests/unit/execution.test.ts
Goal: Script execution with timeout and error handling

Phase 5: Integration Layer (5-6 days)
Files:

src/toolset/SkillsToolset.ts - Main toolset
src/toolset/tools/** - Tool implementations
tests/unit/toolset.test.ts
tests/integration/programmatic.test.ts
tests/integration/progressive-disclosure.test.ts
Goal: Complete agent integration

Phase 6: Testing & Documentation (3-4 days)
Files:

README.md - Package documentation
docs/api.md - API reference
docs/examples.md - Usage examples
tests/** - Coverage verification
Goal: 90%+ test coverage, complete documentation

Testing Strategy
Unit Tests (Target: 90%+ coverage)
Validation logic
Frontmatter parsing
Name normalization
Resource loading
Script execution
Tool implementations
Integration Tests
Filesystem skill discovery
Programmatic skill creation
Progressive disclosure flow
BM25 search functionality
End-to-end agent integration
Test Fixtures
File: /tests/fixtures/skills/arxiv-search/SKILL.md


---
name: arxiv-search
description: Search arXiv for research papers
version: 1.0.0
---

# arXiv Search Skill

Use this skill to search arXiv for academic papers.

## Usage

Run the search script with your query.
File: /tests/fixtures/skills/web-research/SKILL.md


---
name: web-research
description: Conduct comprehensive web research
---

# Web Research Skill

Structured approach to web research.
BM25 Search Test

describe('OramaSearchManager', () => {
  it('should build search index', async () => {
    const skills = new Map([
      ['arxiv-search', mockArxivSkill],
      ['web-research', mockWebResearchSkill],
      ['data-analyzer', mockDataAnalyzerSkill]
    ]);

    await searchManager.buildIndex(skills);
    const results = await searchManager.search('research papers');

    expect(results[0].skill.name).toBe('arxiv-search');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
Verification
1. Build Verification

cd packages/@mimo/skills
pnpm build
# Verify: dist/index.mjs and dist/index.d.mts exist
2. Type Verification

pnpm check-types
# Should pass with no errors
3. Test Verification

pnpm test              # All tests pass
pnpm test:coverage     # 90%+ coverage
4. Integration Verification

// Test file: import and use
import { SkillsToolset, FileSystemDiscovery } from '@mimo/skills';

const toolset = new SkillsToolset({
  directories: ['./tests/fixtures/skills'],
  enableBM25: true
});

await toolset.getInstructions(); // Should return skills overview
await toolset.listSkills();       // Should return all skills
await toolset.searchSkills('research'); // Should use BM25
5. BM25 Search Verification

# Create test skills
mkdir -p /tmp/test-skills/skill-a
echo -e "---\nname: test-a\ndescription: Data analysis tool\n---\nContent" > /tmp/test-skills/skill-a/SKILL.md

# Run test with search
pnpm test -- bm25-search
# Should verify:
# - Index builds correctly
# - Search returns relevant results
# - Boost factors work (name > description > body)
# - Threshold filters low-relevance results
Key Technical Decisions
BM25 Implementation: Using @orama/orama v3.1.18 with:

Mandarin tokenizer for Chinese text
Boost factors: name=3x, description=2x, body=1x
Configurable threshold (default: 0.3)
Singleton pattern for index management
YAML Parsing: Using yaml package (v2.7.0) for frontmatter

Build Tool: tsdown for ESM output (matches monorepo pattern)

Script Execution: Node.js child_process.spawn with Promise wrapper

Path Security: Resolved path validation to prevent traversal attacks

Type Safety: Strict TypeScript with Zod for runtime validation

File Trace Reference
Critical files to create/modify:

File	Lines	Priority
src/types.ts	~250	P0
src/discovery/OramaSearchManager.ts	~200	P0
src/discovery/FileSystemDiscovery.ts	~150	P0
src/toolset/SkillsToolset.ts	~500	P0
src/execution/LocalScriptExecutor.ts	~100	P1
src/skill/Skill.ts	~250	P1
tests/integration/bm25-search.test.ts	~150	P1
Reference files for implementation:

Reference	For implementing
.sources/pydantic-ai-skills/pydantic_ai_skills/types.py	Core interfaces
.sources/pydantic-ai-skills/pydantic_ai_skills/directory.py	Discovery logic
.sources/pydantic-ai-skills/pydantic_ai_skills/toolset.py	Toolset design
.refer/server/utils/skillsIndex/orama.ts	BM25 pattern
.refer/server/utils/skillsIndex/search.ts	Search API
User approved the plan
计划已批准！让我开始实施。首先创建任务列表来跟踪进度。

Update Todos

创建 package.json 和配置文件 (tsdown, tsconfig, vitest)

实现核心类型定义 (src/types.ts)

实现异常类 (src/exceptions.ts)

实现验证工具 (src/validation.ts, src/constants.ts)

创建测试固件和测试基础设施

实现 FrontmatterParser (discovery/)

实现 FileSystemDiscovery (discovery/)

实现 OramaSearchManager BM25 搜索 (discovery/)

实现 Skill 类和相关组件 (skill/)

实现 Resource 类型 (resources/)

实现 Script 类型 (scripts/)

实现执行器 (execution/)

实现 SkillsToolset 和工具 (toolset/)

创建主入口文件 (src/index.ts)

编写单元测试和集成测试

创建文档 (README.md, docs/)
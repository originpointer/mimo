/**
 * Type definitions for the skills framework.
 *
 * This module contains core interfaces and types for skills,
 * their resources, and scripts.
 *
 * @module types
 */

/**
 * A skill resource: static content or callable that generates content.
 */
export interface SkillResource {
  /** Resource name (e.g., "FORMS.md" or "get_samples") */
  name: string;

  /** Description of what the resource provides */
  description?: string;

  /** Static content string */
  content?: string;

  /** Callable that generates content dynamically */
  function?: ResourceCallable;

  /** Whether the function takes RunContext as first argument */
  takesCtx?: boolean;

  /** Function schema for callable resources (for LLM tool integration) */
  functionSchema?: FunctionSchema;

  /** Optional URI string for file-based resources (internal use) */
  uri?: string;

  /** Load resource content */
  load(ctx: unknown, args?: Record<string, unknown>): Promise<unknown>;
}

/**
 * A callable resource function type.
 */
export type ResourceCallable = (
  ctx: unknown,
  args?: Record<string, unknown>
) => Promise<unknown> | unknown;

/**
 * Function schema for LLM tool integration.
 */
export interface FunctionSchema {
  /** JSON Schema for parameters */
  jsonSchema: Record<string, unknown>;

  /** Whether this function takes a context parameter */
  takesCtx: boolean;

  /** Description of the function */
  description?: string;

  /** Call the function with arguments */
  call(args: Record<string, unknown>, ctx: unknown): Promise<unknown>;
}

/**
 * An executable script within a skill.
 *
 * Can be programmatic (function) or file-based (executed via subprocess).
 */
export interface SkillScript {
  /** Script name (includes .py extension for file-based) */
  name: string;

  /** Description of what the script does */
  description?: string;

  /** Callable that implements the script (programmatic) */
  function?: ScriptCallable;

  /** Whether the function takes RunContext as first argument */
  takesCtx?: boolean;

  /** Function schema for callable scripts */
  functionSchema?: FunctionSchema;

  /** Optional URI for file-based scripts (internal use) */
  uri?: string;

  /** Optional parent skill name (internal use) */
  skillName?: string;

  /** Executor for running file-based scripts */
  executor?: ScriptExecutor;

  /** Execute the script */
  run(ctx: unknown, args?: Record<string, unknown>): Promise<unknown>;
}

/**
 * A callable script function type.
 */
export type ScriptCallable = (
  ctx: unknown,
  args?: Record<string, unknown>
) => Promise<unknown> | unknown;

/**
 * Interface for script executors.
 */
export interface ScriptExecutor {
  /** Execute a script with arguments */
  run(script: SkillScript, args?: Record<string, unknown>): Promise<unknown>;
}

/**
 * A skill instance with metadata, content, resources, and scripts.
 *
 * Can be created programmatically or loaded from filesystem directories.
 */
export interface Skill {
  /** Skill name (normalized, follows SKILL_NAME_PATTERN) */
  name: string;

  /** Brief description of what the skill does */
  description: string;

  /** Main instructional content (SKILL.md body) */
  content: string;

  /** Optional license information */
  license?: string;

  /** Optional environment requirements (max 500 chars) */
  compatibility?: string;

  /** List of resources (files or callables) */
  resources: SkillResource[];

  /** List of scripts (functions or file-based) */
  scripts: SkillScript[];

  /** Optional URI for skill's base location (internal use) */
  uri?: string;

  /** Additional metadata fields */
  metadata?: Record<string, unknown>;
}

/**
 * Document type for BM25 search indexing.
 */
export interface SkillDocument {
  /** Unique identifier (skill name) */
  id: string;

  /** Skill name for search */
  name: string;

  /** Skill description for search */
  description: string;

  /** Full skill content for search */
  body: string;

  /** Optional URI */
  uri?: string;
}

/**
 * Search result with relevance score.
 */
export interface SearchResult {
  /** The matched skill */
  skill: Skill;

  /** BM25 relevance score */
  score: number;
}

/**
 * Options for creating a SkillsToolset.
 */
export interface SkillsToolsetOptions {
  /** List of pre-loaded Skill objects */
  skills?: Skill[];

  /** List of directories to discover skills from */
  directories?: string[];

  /** Validate skill structure during discovery */
  validate?: boolean;

  /** Maximum depth for skill discovery (null for unlimited) */
  maxDepth?: number | null;

  /** Enable BM25 search functionality */
  enableBM25?: boolean;

  /** BM25 search threshold (0-1) */
  bm25Threshold?: number;

  /** Custom instruction template for skills system prompt */
  instructionTemplate?: string;

  /** Set or list of tool names to exclude from registration */
  excludeTools?: Set<string> | string[];
}

/**
 * Result from loading a skill.
 */
export interface LoadedSkill {
  /** Skill name */
  name: string;

  /** Skill description */
  description: string;

  /** Skill source location */
  uri: string;

  /** Available resources */
  resources: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;

  /** Available scripts */
  scripts: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;

  /** Full skill instructions */
  instructions: string;
}

/**
 * Discovery options for filesystem-based skill discovery.
 */
export interface DiscoveryOptions {
  /** Validate skill structure on discovery */
  validate?: boolean;

  /** Maximum depth for SKILL.md file search */
  maxDepth?: number;

  /** Optional custom script executor for file-based scripts */
  scriptExecutor?: ScriptExecutor;
}

/**
 * Parsed frontmatter and content from a SKILL.md file.
 */
export interface ParsedSkillContent {
  /** Parsed YAML frontmatter */
  frontmatter: Record<string, unknown>;

  /** Markdown content (instructions) */
  content: string;
}

/**
 * Search options for BM25 search.
 */
export interface SearchOptions {
  /** Maximum number of results to return */
  limit?: number;

  /** Minimum relevance threshold (0-1) */
  threshold?: number;

  /** Field boost factors */
  boost?: {
    /** Weight for name field */
    name?: number;

    /** Weight for description field */
    description?: number;
  };
}

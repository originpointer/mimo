/**
 * Skills toolset for agent integration.
 *
 * Provides progressive disclosure of skills through 5 core tools.
 *
 * @module toolset
 */

import type {
  Skill,
  SkillsToolsetOptions,
  SearchResult
} from '../types.js';
import {
  SkillNotFoundError,
  SkillResourceNotFoundError,
  SkillScriptNotFoundError
} from '../exceptions.js';
import { FileSystemDiscovery } from '../discovery/FileSystemDiscovery.js';
import { OramaSearchManager } from '../discovery/OramaSearchManager.js';
import { createFileBasedResource } from '../resources/index.js';
import { createFileBasedScript } from '../scripts/index.js';
import { createLocalScriptExecutor } from '../execution/index.js';

/**
 * Default instruction template for skills system prompt.
 */
const DEFAULT_INSTRUCTION_TEMPLATE = `You have access to a collection of skills containing domain-specific knowledge and capabilities.
Each skill provides specialized instructions, resources, and scripts for specific tasks.

<available_skills>
{skills_list}
</available_skills>

When a task falls within a skill's domain:
1. Use searchSkills to find relevant skills by query
2. Use loadSkill to read the complete skill instructions
3. Follow the skill's guidance to complete the task
4. Use any additional skill resources and scripts as needed

Use progressive disclosure: load only what you need, when you need it.`;

/**
 * Template used by loadSkill tool.
 */
const LOAD_SKILL_TEMPLATE = `<skill>
<name>{skill_name}</name>
<description>{description}</description>
<uri>{uri}</uri>

<resources>
{resources_list}
</resources>

<scripts>
{scripts_list}
</scripts>

<instructions>
{content}
</instructions>
</skill>`;

/**
 * SkillsToolset - Progressive disclosure skill management.
 *
 * Extends agent capabilities with 5 tools for skill interaction.
 *
 * @example
 * ```ts
 * const toolset = new SkillsToolset({
 *   directories: ['./skills'],
 *   enableBM25: true,
 *   bm25Threshold: 0.3
 * });
 *
 * // Get system prompt with skills overview
 * const instructions = await toolset.getInstructions();
 *
 * // Search for relevant skills
 * const results = await toolset.searchSkills('data analysis');
 * ```
 */
export class SkillsToolset {
  private skills: Map<string, Skill> = new Map();
  private searchManager: OramaSearchManager;
  private options: SkillsToolsetOptions = {
    validate: true,
    maxDepth: 3,
    enableBM25: false,
    bm25Threshold: 0.3,
    instructionTemplate: undefined,
    excludeTools: new Set()
  };

  /**
   * Create a skills toolset.
   *
   * @param options - Toolset configuration options
   */
  constructor(options: SkillsToolsetOptions = {}) {
    this.options = {
      validate: true,
      maxDepth: 3,
      enableBM25: false,
      bm25Threshold: 0.3,
      instructionTemplate: undefined,
      excludeTools: new Set(),
      ...options
    };

    this.searchManager = new OramaSearchManager();
  }

  /**
   * Initialize the toolset (async initialization).
   *
   * Call this after constructor to load skills from directories.
   */
  async initialize(): Promise<void> {
    // Load from directories
    if (this.options.directories) {
      for (const dir of this.options.directories) {
        const discovered = await FileSystemDiscovery.discover(dir, {
          validate: this.options.validate,
          maxDepth: this.options.maxDepth ?? 3
        });

        for (const skill of discovered) {
          // Build resource and script objects from discovered data
          const builtSkill = await this._buildSkill(skill);
          this._registerSkill(builtSkill);
        }
      }
    }

    // Add programmatic skills
    if (this.options.skills) {
      for (const skill of this.options.skills) {
        this._registerSkill(skill);
      }
    }

    // Build BM25 index if enabled
    if (this.options.enableBM25 && this.skills.size > 0) {
      await this.searchManager.buildIndex(this.skills);
    }
  }

  /**
   * Build a skill with resource and script instances.
   */
  private async _buildSkill(skill: Skill): Promise<Skill> {
    // Convert resource descriptors to instances
    // If already an instance (has load method), keep as-is
    const resources = await Promise.all(
      skill.resources.map(async (r) => {
        // If already a resource instance, keep it
        if (typeof r === 'object' && 'load' in r && typeof r.load === 'function') {
          return r;
        }
        // File-based resource descriptor (has uri but no function)
        if (typeof r === 'object' && 'uri' in r && r.uri && !('function' in r)) {
          return createFileBasedResource(r.name, r.uri as string, r.description);
        }
        // Static resource descriptor (has content, no uri)
        if (typeof r === 'object' && 'content' in r && r.content && !('uri' in r)) {
          return createFileBasedResource(r.name, r.content as string, r.description);
        }
        return r;
      })
    );

    // Convert script descriptors to instances
    // If already an instance (has run method), keep as-is
    const scripts = skill.scripts.map((s) => {
      if (typeof s === 'object' && 'run' in s && typeof s.run === 'function') {
        return s;
      }
      if (typeof s === 'object' && 'uri' in s && s.uri && !('function' in s)) {
        // File-based script descriptor
        const executor = createLocalScriptExecutor();
        return createFileBasedScript(s.name, s.uri as string, executor, s.description);
      }
      return s;
    });

    return {
      ...skill,
      resources,
      scripts
    };
  }

  /**
   * Register a skill with the toolset.
   */
  private _registerSkill(skill: Skill): void {
    if (this.skills.has(skill.name)) {
      console.warn(`Duplicate skill '${skill.name}' found. Overriding previous occurrence.`);
    }
    this.skills.set(skill.name, skill);
  }

  /**
   * Get a specific skill by name.
   *
   * @param name - Name of the skill to get
   * @returns The requested Skill object
   * @throws {@link SkillNotFoundError} If skill is not found
   */
  getSkill(name: string): Skill {
    const skill = this.skills.get(name);
    if (!skill) {
      const available = Array.from(this.skills.keys()).sort().join(', ') || 'none';
      throw new SkillNotFoundError(
        `Skill '${name}' not found. Available: ${available}`
      );
    }
    return skill;
  }

  /**
   * Get all loaded skills.
   *
   * @returns Dictionary mapping skill names to Skill objects
   */
  getSkills(): Map<string, Skill> {
    return new Map(this.skills);
  }

  // ==================== TOOLS ====================

  /**
   * Tool 1: List all available skills.
   *
   * @returns Dictionary mapping skill names to their descriptions
   */
  async listSkills(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const [name, skill] of this.skills) {
      result[name] = skill.description;
    }
    return result;
  }

  /**
   * Tool 2: Load complete instructions for a skill.
   *
   * @param skillName - Exact name from available skills list
   * @returns Structured documentation with resources, scripts, and instructions
   * @throws {@link SkillNotFoundError} If skill not found
   */
  async loadSkill(skillName: string): Promise<string> {
    const skill = this.getSkill(skillName);

    // Build resources list
    const resourcesList = skill.resources.length > 0
      ? skill.resources.map(r => {
        const attrs = `name="${r.name}"`;
        if (r.description) {
          return `<resource ${attrs} description="${r.description}" />`;
        }
        return `<resource ${attrs} />`;
      }).join('\n')
      : '<!-- No resources -->';

    // Build scripts list
    const scriptsList = skill.scripts.length > 0
      ? skill.scripts.map(s => {
        const attrs = `name="${s.name}"`;
        if (s.description) {
          return `<script ${attrs} description="${s.description}" />`;
        }
        return `<script ${attrs} />`;
      }).join('\n')
      : '<!-- No scripts -->';

    return LOAD_SKILL_TEMPLATE
      .replace('{skill_name}', skill.name)
      .replace('{description}', skill.description)
      .replace('{uri}', skill.uri || 'N/A')
      .replace('{resources_list}', resourcesList)
      .replace('{scripts_list}', scriptsList)
      .replace('{content}', skill.content);
  }

  /**
   * Tool 3: Read a skill resource.
   *
   * @param skillName - Name of the skill containing the resource
   * @param resourceName - Exact name of the resource as listed in the skill
   * @param args - Arguments for callable resources (optional for static files)
   * @returns The resource content
   * @throws {@link SkillNotFoundError} If skill not found
   * @throws {@link SkillResourceNotFoundError} If resource not found
   */
  async readSkillResource(
    skillName: string,
    resourceName: string,
    args?: Record<string, unknown>
  ): Promise<string> {
    const skill = this.getSkill(skillName);

    const resource = skill.resources.find(r => r.name === resourceName);
    if (!resource) {
      const available = skill.resources.map(r => r.name).join(', ') || 'none';
      throw new SkillResourceNotFoundError(
        `Resource '${resourceName}' not found in skill '${skillName}'. Available: ${available}`
      );
    }

    const result = await resource.load(null, args);
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  /**
   * Tool 4: Execute a skill script.
   *
   * @param skillName - Name of the skill containing the script
   * @param scriptName - Exact name of the script as listed in the skill
   * @param args - Arguments required by the script
   * @returns Script execution output
   * @throws {@link SkillNotFoundError} If skill not found
   * @throws {@link SkillScriptNotFoundError} If script not found
   */
  async runSkillScript(
    skillName: string,
    scriptName: string,
    args?: Record<string, unknown>
  ): Promise<string> {
    const skill = this.getSkill(skillName);

    const script = skill.scripts.find(s => s.name === scriptName);
    if (!script) {
      const available = skill.scripts.map(s => s.name).join(', ') || 'none';
      throw new SkillScriptNotFoundError(
        `Script '${scriptName}' not found in skill '${skillName}'. Available: ${available}`
      );
    }

    const result = await script.run(null, args);
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  /**
   * Tool 5: Search for skills using BM25.
   *
   * @param query - Search query string
   * @param limit - Maximum number of results (default: 10)
   * @returns Array of search results with names, descriptions, and scores
   */
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

  // ==================== PROGRESSIVE DISCLOSURE ====================

  /**
   * Return instructions to inject into agent's system prompt.
   *
   * Returns the skills system prompt containing usage guidance and all skill metadata.
   *
   * @returns The skills system prompt, or null if no skills are loaded
   */
  async getInstructions(): Promise<string | null> {
    if (this.skills.size === 0) {
      return null;
    }

    // Build skills list in XML format
    const skillsList = Array.from(this.skills.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(skill =>
        `<skill><name>${skill.name}</name><description>${skill.description}</description></skill>`
      )
      .join('\n');

    const template = this.options.instructionTemplate || DEFAULT_INSTRUCTION_TEMPLATE;
    return template.replace('{skills_list}', skillsList);
  }

  /**
   * Check if BM25 search is enabled.
   */
  isBM25Enabled(): boolean {
    return (this.options.enableBM25 === true) && this.searchManager.isReady();
  }

  /**
   * Get the search manager (for advanced usage).
   */
  getSearchManager(): OramaSearchManager {
    return this.searchManager;
  }
}

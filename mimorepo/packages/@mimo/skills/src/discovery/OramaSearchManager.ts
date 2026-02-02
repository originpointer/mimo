/**
 * BM25 search manager using Orama.
 *
 * Provides full-text search functionality for skills using BM25 algorithm.
 *
 * @module discovery
 */

import { create, insert, search, Orama } from '@orama/orama';
import type { Result } from '@orama/orama';
import type { Skill, SkillDocument, SearchResult, SearchOptions } from '../types.js';

/**
 * Orama database schema for skills.
 */
const SKILLS_SCHEMA = {
  id: 'string',
  name: 'string',
  description: 'string',
  body: 'string',
  uri: 'string'
} as const;

/**
 * Type for the Orama database.
 */
export type SkillsDB = Orama<typeof SKILLS_SCHEMA>;

/**
 * Orama search result with typed document.
 */
type SkillsResult = Result<SkillsDB>;

/**
 * BM25 search manager using Orama.
 *
 * Provides full-text search functionality for skills with configurable
 * relevance thresholds and boost factors.
 *
 * @example
 * ```ts
 * const searchManager = new OramaSearchManager();
 * await searchManager.buildIndex(skillsMap);
 * const results = await searchManager.search('research papers', {
 *   limit: 10,
 *   threshold: 0.3,
 *   boost: { name: 3, description: 2 }
 * });
 * ```
 */
export class OramaSearchManager {
  private db: SkillsDB | null = null;
  private skills: Map<string, Skill> = new Map();
  private built = false;

  /**
   * Build the search index from a map of skills.
   *
   * @param skills - Map of skill name to Skill object
   * @throws Error if index has already been built
   *
   * @example
   * ```ts
   * const skills = new Map([
   *   ['arxiv-search', arxivSkill],
   *   ['web-research', webResearchSkill]
   * ]);
   * await searchManager.buildIndex(skills);
   * ```
   */
  async buildIndex(skills: Map<string, Skill>): Promise<void> {
    if (this.built) {
      throw new Error('Search index has already been built. Create a new instance for a fresh index.');
    }

    this.skills = new Map(skills);

    // Create Orama database
    this.db = create({
      schema: SKILLS_SCHEMA,
      sort: {
        enabled: false
      }
    });

    // Build documents array
    const docs: SkillDocument[] = Array.from(skills.values()).map(skill => ({
      id: skill.name,
      name: skill.name,
      description: skill.description,
      body: skill.content,
      uri: skill.uri || ''
    }));

    // Insert documents
    for (const doc of docs) {
      insert(this.db, doc);
    }

    this.built = true;
  }

  /**
   * Search for skills using BM25.
   *
   * @param query - Search query string
   * @param options - Search options
   * @returns Array of search results with skills and scores
   * @throws Error if index hasn't been built
   *
   * @example
   * ```ts
   * // Basic search
   * const results = await searchManager.search('data analysis');
   *
   * // With options
   * const results = await searchManager.search('research', {
   *   limit: 5,
   *   threshold: 0.5,
   *   boost: { name: 3, description: 2 }
   * });
   * ```
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.db || !this.built) {
      throw new Error(
        'Search index not built. Call buildIndex() with a map of skills before searching.'
      );
    }

    const {
      limit = 10,
      threshold = 0,
      boost = { name: 3, description: 2 }
    } = options;

    // Execute search
    const results = await search(this.db, {
      term: query,
      properties: ['name', 'description', 'body'],
      boost,
      limit,
      threshold
    }) as SkillsResult;

    // Map results to skills
    return results.hits.map((hit) => {
      const skill = this.skills.get(hit.document.id);
      if (!skill) {
        throw new Error(`Skill '${hit.document.id}' not found in skills map`);
      }
      return {
        skill,
        score: hit.score
      };
    });
  }

  /**
   * Get the number of skills in the index.
   *
   * @returns Number of indexed skills
   */
  getCount(): number {
    return this.skills.size;
  }

  /**
   * Check if the index has been built.
   *
   * @returns true if index is ready for searching
   */
  isReady(): boolean {
    return this.built && this.db !== null;
  }

  /**
   * Get all indexed skills.
   *
   * @returns Map of skill name to Skill object
   */
  getSkills(): Map<string, Skill> {
    return new Map(this.skills);
  }

  /**
   * Clear the index and reset the manager.
   *
   * This allows rebuilding the index with new skills.
   */
  clear(): void {
    this.db = null;
    this.skills.clear();
    this.built = false;
  }
}

// Re-export for convenience
export default OramaSearchManager;

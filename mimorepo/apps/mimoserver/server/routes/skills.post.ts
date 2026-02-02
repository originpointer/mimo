import { eventHandler, readBody, createError } from 'h3';
import { SkillsToolset } from '@mimo/skills';
import { join } from 'path';

// Skills directory path relative to the server root
const SKILLS_DIR = join(process.cwd(), '.skills');

// Singleton instance of SkillsToolset
let toolsetInstance: SkillsToolset | null = null;
let initializing = false;

/**
 * Get or initialize the SkillsToolset singleton
 */
async function getToolset(): Promise<SkillsToolset> {
  if (toolsetInstance) {
    return toolsetInstance;
  }

  // Wait if another request is initializing
  if (initializing) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getToolset();
  }

  initializing = true;

  try {
    const toolset = new SkillsToolset({
      directories: [SKILLS_DIR],
      enableBM25: true,
      bm25Threshold: 0.3,
    });

    await toolset.initialize();
    toolsetInstance = toolset;
    return toolset;
  } finally {
    initializing = false;
  }
}

/**
 * Request body schema
 */
interface SkillRequestBody {
  action?: 'list' | 'search' | 'load' | 'run' | 'instructions';
  query?: string;
  limit?: number;
  skillName?: string;
  scriptName?: string;
  args?: Record<string, unknown>;
}

/**
 * POST /skills
 *
 * Query and execute skills from the .skills directory
 *
 * Request body:
 * - action: 'list' | 'search' | 'load' | 'run' | 'instructions'
 * - query: search query string (for 'search' action)
 * - limit: maximum number of results (for 'search' action)
 * - skillName: name of the skill (for 'load' or 'run' action)
 * - scriptName: name of the script to run (for 'run' action)
 * - args: arguments for the script (for 'run' action)
 *
 * Response:
 * - list: Record<string, string> - skill name to description mapping
 * - search: SearchResult[] - array of search results with scores
 * - load: string - full skill content in XML format
 * - run: string - script execution output
 * - instructions: string - system instructions with available skills overview
 */
export default eventHandler(async (event) => {
  try {
    const body: SkillRequestBody = await readBody(event);
    const { action = 'list', query, limit = 5, skillName, scriptName, args } = body;

    const toolset = await getToolset();

    switch (action) {
      case 'list': {
        const skills = await toolset.listSkills();
        return {
          ok: true,
          data: skills,
        };
      }

      case 'search': {
        if (!query) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Query parameter is required for search action',
          });
        }

        const results = await toolset.searchSkills(query, limit);
        return {
          ok: true,
          data: results,
        };
      }

      case 'load': {
        if (!skillName) {
          throw createError({
            statusCode: 400,
            statusMessage: 'skillName parameter is required for load action',
          });
        }

        const skillContent = await toolset.loadSkill(skillName);
        return {
          ok: true,
          data: { skillName, content: skillContent },
        };
      }

      case 'run': {
        if (!skillName) {
          throw createError({
            statusCode: 400,
            statusMessage: 'skillName parameter is required for run action',
          });
        }
        if (!scriptName) {
          throw createError({
            statusCode: 400,
            statusMessage: 'scriptName parameter is required for run action',
          });
        }

        const result = await toolset.runSkillScript(skillName, scriptName, args);
        return {
          ok: true,
          data: { skillName, scriptName, output: result },
        };
      }

      case 'instructions': {
        const instructions = await toolset.getInstructions();
        return {
          ok: true,
          data: { instructions },
        };
      }

      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Unknown action: ${action}`,
        });
    }
  } catch (error) {
    console.error('Error in skill API:', error);

    // Re-throw H3 errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * Filesystem-based skill discovery.
 *
 * Scans directories for SKILL.md files and loads skills with metadata,
 * resources, and scripts.
 *
 * @module discovery
 */

import { promises as fs } from 'fs';
import { join, relative, resolve } from 'path';
import { FrontmatterParser } from './FrontmatterParser.js';
import { validateSkillMetadata } from '../validation.js';
import { SUPPORTED_RESOURCE_EXTENSIONS, DEFAULT_MAX_DEPTH } from '../constants.js';
import type { Skill, DiscoveryOptions, ParsedSkillContent } from '../types.js';

/**
 * Result from finding skill files.
 */
interface SkillFileResult {
  /** Full path to the SKILL.md file */
  path: string;

  /** Parent directory name */
  dirName: string;
}

/**
 * FileSystem-based skill discovery.
 *
 * Scans a directory for SKILL.md files and loads skill definitions.
 */
export class FileSystemDiscovery {
  /**
   * Discover skills from a filesystem directory.
   *
   * @param rootDir - Root directory to search for skills
   * @param options - Discovery options
   * @returns List of discovered Skill objects
   *
   * @example
   * ```ts
   * const skills = await FileSystemDiscovery.discover('./skills', {
   *   validate: true,
   *   maxDepth: 3
   * });
   * ```
   */
  static async discover(
    rootDir: string,
    options: DiscoveryOptions = {}
  ): Promise<Skill[]> {
    const {
      validate = true,
      maxDepth = DEFAULT_MAX_DEPTH
    } = options;

    const skills: Skill[] = [];
    const skillFiles = await this._findSkillFiles(rootDir, maxDepth);

    for (const { path: skillPath } of skillFiles) {
      try {
        const skill = await this._loadSkillFromFile(skillPath);

        if (validate) {
          const validation = validateSkillMetadata(
            skill.metadata || {},
            skill.content
          );

          // Log warnings but don't fail
          for (const warning of validation.warnings) {
            console.warn(`[Skill: ${skill.name}] ${warning}`);
          }

          if (!validation.isValid && !skill.name) {
            // Only skip if completely invalid (no name)
            continue;
          }
        }

        skills.push(skill);
      } catch (error) {
        console.warn(`Failed to load skill from ${skillPath}:`, error);
        if (validate) {
          throw error; // Re-throw in validation mode
        }
      }
    }

    return skills;
  }

  /**
   * Find SKILL.md files with depth-limited search.
   *
   * @param rootDir - Root directory to search from
   * @param maxDepth - Maximum depth to search
   * @returns List of paths to SKILL.md files
   */
  private static async _findSkillFiles(
    rootDir: string,
    maxDepth: number
  ): Promise<SkillFileResult[]> {
    const results: SkillFileResult[] = [];

    async function scanDir(dir: string, depth: number) {
      if (depth > maxDepth) return;

      let entries: import('fs').Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        // Directory not accessible, skip
        return;
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanDir(fullPath, depth + 1);
        } else if (entry.name === 'SKILL.md') {
          results.push({
            path: fullPath,
            dirName: relative(rootDir, dir)
          });
        }
      }
    }

    await scanDir(rootDir, 0);
    return results;
  }

  /**
   * Load a skill from a SKILL.md file.
   *
   * @param filePath - Path to the SKILL.md file
   * @returns Loaded Skill object
   */
  private static async _loadSkillFromFile(filePath: string): Promise<Skill> {
    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter, content: instructions } = FrontmatterParser.parse(content);

    const name = frontmatter.name as string | undefined;
    const description = frontmatter.description as string | undefined;
    const license = frontmatter.license as string | undefined;
    const compatibility = frontmatter.compatibility as string | undefined;

    // Extract metadata excluding standard fields
    const metadata: Record<string, unknown> = {};
    const standardFields = new Set(['name', 'description', 'license', 'compatibility']);
    for (const [key, value] of Object.entries(frontmatter)) {
      if (!standardFields.has(key)) {
        metadata[key] = value;
      }
    }

    const skillFolder = resolve(filePath, '..');

    return {
      name: name || '',
      description: description || '',
      content: instructions,
      license,
      compatibility,
      uri: skillFolder,
      resources: await this._discoverResources(skillFolder),
      scripts: await this._discoverScripts(skillFolder, name || 'unknown'),
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    };
  }

  /**
   * Discover resource files in a skill folder.
   *
   * Resources are text files other than SKILL.md in any subdirectory.
   *
   * @param skillFolder - Path to the skill directory
   * @returns List of resource descriptors
   */
  private static async _discoverResources(
    skillFolder: string
  ): Promise<Array<{ name: string; uri: string; description?: string }>> {
    const resources: Array<{ name: string; uri: string; description?: string }> = [];
    const skillFolderResolved = resolve(skillFolder);

    for (const ext of SUPPORTED_RESOURCE_EXTENSIONS) {
      const pattern = `**/*${ext}`;

      try {
        const { glob } = await import('glob');
        const files = await glob(pattern, {
          cwd: skillFolder,
          absolute: false,
          nodir: true,
          ignore: ['**/SKILL.md']
        });

        for (const file of files) {
          // Security check: verify path stays within skill folder
          const resolvedPath = resolve(skillFolder, file);
          try {
            relative(skillFolderResolved, resolvedPath);
          } catch {
            console.warn(`Resource '${file}' resolves outside skill directory (symlink escape). Skipping.`);
            continue;
          }

          resources.push({
            name: file.replace(/\\/g, '/'), // Normalize path separators
            uri: resolvedPath,
            description: `Resource file: ${file}`
          });
        }
      } catch {
        // glob package not available, skip
      }
    }

    return resources;
  }

  /**
   * Discover executable scripts in a skill folder.
   *
   * Looks for Python scripts in the root and scripts/ subdirectory.
   *
   * @param skillFolder - Path to the skill directory
   * @param skillName - Name of the parent skill
   * @returns List of script descriptors
   */
  private static async _discoverScripts(
    skillFolder: string,
    skillName: string
  ): Promise<Array<{ name: string; uri: string; description?: string }>> {
    const scripts: Array<{ name: string; uri: string; description?: string }> = [];
    const skillFolderResolved = resolve(skillFolder);

    const scriptLocations = [
      skillFolder, // Root directory
      join(skillFolder, 'scripts') // scripts/ subdirectory
    ];

    for (const location of scriptLocations) {
      try {
        const entries = await fs.readdir(location, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.py') && entry.name !== '__init__.py') {
            const scriptPath = join(location, entry.name);
            const resolvedPath = resolve(scriptPath);

            // Security check
            try {
              relative(skillFolderResolved, resolvedPath);
            } catch {
              console.warn(`Script '${entry.name}' resolves outside skill directory (symlink escape). Skipping.`);
              continue;
            }

            // Get relative path from skill folder
            const relPath = relative(skillFolder, scriptPath).replace(/\\/g, '/');

            scripts.push({
              name: relPath,
              uri: resolvedPath,
              description: `Script: ${relPath}`
            });
          }
        }
      } catch {
        // Directory not accessible, skip
      }
    }

    return scripts;
  }
}

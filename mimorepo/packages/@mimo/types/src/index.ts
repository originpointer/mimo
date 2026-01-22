/**
 * Mimo Types - Shared type definitions
 */

/**
 * Model configuration
 */
export type ModelConfiguration =
  | string
  | {
      modelName: string;
      apiKey?: string;
      baseURL?: string;
    };

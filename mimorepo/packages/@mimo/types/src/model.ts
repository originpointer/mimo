/**
 * Model configuration types
 */

/**
 * Model configuration
 * Can be a simple model name string or a configuration object
 */
export type ModelConfiguration =
  | string
  | {
      modelName: string;
      apiKey?: string;
      baseURL?: string;
    };

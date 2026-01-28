/**
 * Factory functions for creating MimoEngine instances
 */

import type { MimoEngine, MimoEngineConfig } from '@mimo/types';
import { MimoEngine as MimoEngineClass } from './mimo-engine.js';

/**
 * Create a MimoEngine instance
 *
 * @param config - Engine configuration options
 * @returns MimoEngine instance (not connected yet)
 *
 * @example
 * ```typescript
 * const engine = createMimoEngine({
 *   busUrl: 'http://localhost:6007',
 *   heartbeatInterval: 30000,
 *   debug: true,
 * });
 *
 * await engine.connect();
 * ```
 */
export function createMimoEngine(config?: MimoEngineConfig): MimoEngine {
  return new MimoEngineClass(config);
}

/**
 * Create and connect a MimoEngine instance
 *
 * @param config - Engine configuration options
 * @returns Connected MimoEngine instance
 *
 * @example
 * ```typescript
 * const engine = await createMimoEngineAndConnect({
 *   busUrl: 'http://localhost:6007',
 *   debug: true,
 * });
 *
 * console.log('Connected:', engine.isConnected());
 * ```
 */
export async function createMimoEngineAndConnect(config?: MimoEngineConfig): Promise<MimoEngine> {
  const engine = createMimoEngine(config);
  await engine.connect();
  return engine;
}

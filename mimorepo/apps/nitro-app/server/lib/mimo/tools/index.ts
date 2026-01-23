/**
 * Mimo MCP Tools - Export all tools
 */

import { mimoActTool } from './act'
import { mimoExtractTool } from './extract'
import { mimoObserveTool } from './observe'
import { mimoAgentTool } from './agent'
import { mimoNavigateTool } from './navigate'

export const mimoTools = [mimoActTool, mimoExtractTool, mimoObserveTool, mimoAgentTool, mimoNavigateTool]

// Individual exports for convenience
export { mimoActTool } from './act'
export { mimoExtractTool } from './extract'
export { mimoObserveTool } from './observe'
export { mimoAgentTool } from './agent'
export { mimoNavigateTool } from './navigate'

/**
 * Tool Registry for MCP-UI and Protocol Compatibility
 *
 * Provides:
 * - Tool capability discovery
 * - Tool schema lookup
 * - Tool execution with structured results
 */

import { getAllToolSchemas, validateToolInput } from './toolSchemas.js';
import type { ToolSchema } from './toolSchemas.js';

/**
 * Tool execution result following MCP-UI format
 */
export interface ToolResult {
  /** Status of tool execution */
  status: 'success' | 'failure' | 'partial';

  /** The actual result data */
  result: unknown;

  /** Any error message if status is 'failure' or 'partial' */
  error?: string;

  /** Metadata about the tool execution */
  metadata?: {
    execution_time_ms?: number;
    artifacts?: Record<string, unknown>;
  };

  /** UI update commands (server-driven updates) */
  ui_updates?: Array<{
    type: string;
    target: string;
    data: unknown;
  }>;
}

/**
 * Get all available tools
 */
function listAvailableTools(): ToolSchema[] {
  return getAllToolSchemas();
}

/**
 * Execute a tool with validation and structured result
 */
export function executeTool(
  toolName: string,
  input: Record<string, unknown>
): ToolResult {
  // Validate input
  const validationErrors = validateToolInput(toolName, input);
  if (validationErrors.length > 0) {
    return {
      status: 'failure',
      result: null,
      error: `Validation failed: ${validationErrors.join('; ')}`,
    };
  }

  // For now, tools are simple transformations
  // In future, these could be delegated to tool implementations
  switch (toolName) {
    case 'zoom_in':
    case 'zoom_out':
      return {
        status: 'success',
        result: {
          tool_name: toolName,
          executed_at: new Date().toISOString(),
        },
        metadata: {
          execution_time_ms: 0,
        },
      };

    default:
      return {
        status: 'failure',
        result: null,
        error: `Unknown tool: ${toolName}`,
      };
  }
}

/**
 * Tool registry for capability discovery and execution
 */
export const toolRegistry = {
  /**
   * Get list of available tools
   */
  list(): ToolSchema[] {
    return listAvailableTools();
  },

  /**
   * Get schema for a specific tool
   */
  getSchema(toolName: string): ToolSchema | undefined {
    return listAvailableTools().find((t) => t.name === toolName);
  },

  /**
   * Execute a tool with validation
   */
  execute(toolName: string, input: Record<string, unknown>): ToolResult {
    return executeTool(toolName, input);
  },

  /**
   * Check if a tool exists
   */
  exists(toolName: string): boolean {
    return listAvailableTools().some((t) => t.name === toolName);
  },
};

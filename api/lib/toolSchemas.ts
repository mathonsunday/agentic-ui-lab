/**
 * Tool JSON Schemas for MCP-UI Compatibility
 *
 * Defines JSON Schema for each tool that Mira supports.
 * Enables:
 * - Tool capability discovery
 * - Input validation
 * - Type-safe tool invocation
 * - Tool result schema definition
 */

/**
 * JSON Schema representation of a tool
 */
export interface ToolSchema {
  /** Tool name/identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** JSON Schema for tool inputs */
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };

  /** JSON Schema for tool outputs */
  output_schema: {
    type: 'object';
    properties: Record<string, unknown>;
  };

  /** Whether this tool produces side effects */
  has_side_effects: boolean;
}

/**
 * Zoom In Tool
 * Increases zoom level to show more detail of current ASCII creature
 */
export const zoomInSchema: ToolSchema = {
  name: 'zoom_in',
  description: 'Zoom in to see more detail of the current ASCII art creature',
  input_schema: {
    type: 'object',
    properties: {
      current_zoom: {
        type: 'string',
        description: 'Current zoom level',
        enum: ['far', 'medium', 'close'],
      },
    },
    required: ['current_zoom'],
  },
  output_schema: {
    type: 'object',
    properties: {
      new_zoom: {
        type: 'string',
        description: 'New zoom level after zooming in',
        enum: ['far', 'medium', 'close'],
      },
      confidence_delta: {
        type: 'number',
        description: 'Change in confidence (typically +5)',
      },
    },
  },
  has_side_effects: true,
};

/**
 * Zoom Out Tool
 * Decreases zoom level to show less detail of current ASCII creature
 */
export const zoomOutSchema: ToolSchema = {
  name: 'zoom_out',
  description: 'Zoom out to see less detail of the current ASCII art creature',
  input_schema: {
    type: 'object',
    properties: {
      current_zoom: {
        type: 'string',
        description: 'Current zoom level',
        enum: ['far', 'medium', 'close'],
      },
    },
    required: ['current_zoom'],
  },
  output_schema: {
    type: 'object',
    properties: {
      new_zoom: {
        type: 'string',
        description: 'New zoom level after zooming out',
        enum: ['far', 'medium', 'close'],
      },
      confidence_delta: {
        type: 'number',
        description: 'Change in confidence (typically +5)',
      },
    },
  },
  has_side_effects: true,
};

/**
 * All available tool schemas indexed by tool name
 */
export const ALL_TOOL_SCHEMAS: Record<string, ToolSchema> = {
  zoom_in: zoomInSchema,
  zoom_out: zoomOutSchema,
};

/**
 * Get schema for a specific tool
 */
export function getToolSchema(toolName: string): ToolSchema | undefined {
  return ALL_TOOL_SCHEMAS[toolName];
}

/**
 * Validate tool input against its schema
 * Returns validation errors if any
 */
export function validateToolInput(
  toolName: string,
  input: Record<string, unknown>
): string[] {
  const schema = getToolSchema(toolName);
  if (!schema) {
    return [`Unknown tool: ${toolName}`];
  }

  const errors: string[] = [];
  const requiredFields = schema.input_schema.required || [];

  // Check required fields
  for (const field of requiredFields) {
    if (!(field in input)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return errors;
}

/**
 * Get all available tool schemas
 */
export function getAllToolSchemas(): ToolSchema[] {
  return Object.values(ALL_TOOL_SCHEMAS);
}

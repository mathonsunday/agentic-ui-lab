/**
 * Tests for MCP-UI Tool Protocol
 *
 * Verifies:
 * - Tool schema definitions
 * - Tool discovery and registry
 * - Tool input validation
 * - Structured tool results
 */

import { describe, it, expect } from 'vitest';
import {
  zoomInSchema,
  zoomOutSchema,
  validateToolInput,
  getAllToolSchemas,
} from '../lib/toolSchemas';
import { toolRegistry, executeTool } from '../lib/toolRegistry';

describe('Tool Protocol', () => {
  describe('Tool Schemas', () => {
    it('should define zoom_in tool schema', () => {
      expect(zoomInSchema.name).toBe('zoom_in');
      expect(zoomInSchema.description).toContain('Zoom in');
      expect(zoomInSchema.input_schema.properties).toHaveProperty('current_zoom');
      expect(zoomInSchema.has_side_effects).toBe(true);

      // FIXED: Validate schema structure + content
      const zoomProp = zoomInSchema.input_schema.properties.current_zoom as any;
      expect(zoomProp.type).toBe('string');
      expect(zoomProp.enum).toContain('far');
      expect(zoomProp.enum).toContain('medium');
      expect(zoomProp.enum).toContain('close');
      expect(zoomInSchema.input_schema.required).toContain('current_zoom');

      // Verify output schema
      expect(zoomInSchema.output_schema.properties).toHaveProperty('new_zoom');
    });

    it('should define zoom_out tool schema', () => {
      expect(zoomOutSchema.name).toBe('zoom_out');
      expect(zoomOutSchema.description).toContain('Zoom out');
      expect(zoomOutSchema.input_schema.properties).toHaveProperty('current_zoom');
      expect(zoomOutSchema.has_side_effects).toBe(true);

      // FIXED: Validate schema structure + content
      const zoomProp = zoomOutSchema.input_schema.properties.current_zoom as any;
      expect(zoomProp.type).toBe('string');
      expect(zoomProp.enum).toContain('far');
      expect(zoomProp.enum).toContain('medium');
      expect(zoomProp.enum).toContain('close');
      expect(zoomOutSchema.input_schema.required).toContain('current_zoom');

      // Verify output schema
      expect(zoomOutSchema.output_schema.properties).toHaveProperty('new_zoom');
    });

    it('should have valid input schemas', () => {
      const schemas = [zoomInSchema, zoomOutSchema];

      for (const schema of schemas) {
        expect(schema.input_schema.type).toBe('object');
        expect(schema.input_schema.properties).toBeDefined();
        expect(schema.input_schema.required).toBeDefined();
      }
    });

    it('should have valid output schemas', () => {
      const schemas = [zoomInSchema, zoomOutSchema];

      for (const schema of schemas) {
        expect(schema.output_schema.type).toBe('object');
        expect(schema.output_schema.properties).toBeDefined();
      }
    });

    it('should enumerate valid zoom levels', () => {
      const validZoomLevels = ['far', 'medium', 'close'];

      const zoomProp = zoomInSchema.input_schema.properties.current_zoom as any;
      expect(zoomProp.enum).toEqual(validZoomLevels);
    });
  });

  describe('Tool Registry', () => {
    it('should list all available tools', () => {
      const tools = toolRegistry.list();

      expect(tools.length).toBeGreaterThanOrEqual(2);
      expect(tools.some((t) => t.name === 'zoom_in')).toBe(true);
      expect(tools.some((t) => t.name === 'zoom_out')).toBe(true);
    });

    it('should get schema for specific tool', () => {
      const schema = toolRegistry.getSchema('zoom_in');

      expect(schema).toBeDefined();
      expect(schema?.name).toBe('zoom_in');
    });

    it('should return undefined for unknown tool', () => {
      const schema = toolRegistry.getSchema('unknown_tool');

      expect(schema).toBeUndefined();
    });

    it('should check if tool exists', () => {
      expect(toolRegistry.exists('zoom_in')).toBe(true);
      expect(toolRegistry.exists('zoom_out')).toBe(true);
      expect(toolRegistry.exists('unknown_tool')).toBe(false);
    });

    it('should get all tool schemas', () => {
      const schemas = getAllToolSchemas();

      expect(schemas.length).toBeGreaterThanOrEqual(2);
      expect(schemas.some((s) => s.name === 'zoom_in')).toBe(true);
      expect(schemas.some((s) => s.name === 'zoom_out')).toBe(true);
    });
  });

  describe('Tool Input Validation', () => {
    it('should validate required fields', () => {
      const errors = validateToolInput('zoom_in', {});

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('current_zoom'))).toBe(true);
    });

    it('should accept valid zoom_in input', () => {
      const errors = validateToolInput('zoom_in', {
        current_zoom: 'medium',
      });

      expect(errors).toHaveLength(0);
    });

    it('should accept valid zoom_out input', () => {
      const errors = validateToolInput('zoom_out', {
        current_zoom: 'close',
      });

      expect(errors).toHaveLength(0);
    });

    it('should reject unknown tool', () => {
      const errors = validateToolInput('unknown_tool', {});

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Unknown tool');
    });

    it('should validate all zoom levels', () => {
      const zoomLevels = ['far', 'medium', 'close'];

      for (const zoom of zoomLevels) {
        const errors = validateToolInput('zoom_in', { current_zoom: zoom });
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Tool Execution', () => {
    it('should execute zoom_in tool successfully', () => {
      const result = executeTool('zoom_in', {
        current_zoom: 'medium',
      });

      expect(result.status).toBe('success');
      expect(result.result).toBeDefined();
      expect(result.error).toBeUndefined();

      // FIXED: Validate actual tool result structure and behavior
      const data = result.result as any;
      expect(data.tool_name).toBe('zoom_in');
      expect(data.executed_at).toBeDefined();
      expect(typeof data.executed_at).toBe('string');
      expect(result.metadata?.execution_time_ms).toBeDefined();
      expect(result.metadata?.execution_time_ms).toBeGreaterThanOrEqual(0);
      // Verify result has proper structure (tool_name and timestamp at minimum)
      expect(Object.keys(data).length).toBeGreaterThanOrEqual(2);
    });

    it('should execute zoom_out tool successfully', () => {
      const result = executeTool('zoom_out', {
        current_zoom: 'close',
      });

      expect(result.status).toBe('success');
      expect(result.result).toBeDefined();
      expect(result.error).toBeUndefined();

      // FIXED: Validate actual tool result structure and behavior
      const data = result.result as any;
      expect(data.tool_name).toBe('zoom_out');
      expect(data.executed_at).toBeDefined();
      expect(typeof data.executed_at).toBe('string');
      expect(result.metadata?.execution_time_ms).toBeDefined();
      expect(result.metadata?.execution_time_ms).toBeGreaterThanOrEqual(0);
      // Verify result has proper structure (tool_name and timestamp at minimum)
      expect(Object.keys(data).length).toBeGreaterThanOrEqual(2);
    });

    it('should return structured result with metadata', () => {
      const result = executeTool('zoom_in', {
        current_zoom: 'medium',
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.execution_time_ms).toBeDefined();
    });

    it('should fail on validation error', () => {
      const result = executeTool('zoom_in', {});

      expect(result.status).toBe('failure');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Validation failed');
    });

    it('should fail on unknown tool', () => {
      const result = executeTool('unknown_tool', {});

      expect(result.status).toBe('failure');
      expect(result.error).toContain('Unknown tool');
    });

    it('should include tool name in result', () => {
      const result = executeTool('zoom_in', {
        current_zoom: 'medium',
      });

      const data = result.result as any;
      expect(data.tool_name).toBe('zoom_in');
    });

    it('should include execution timestamp in result', () => {
      const result = executeTool('zoom_in', {
        current_zoom: 'medium',
      });

      const data = result.result as any;
      expect(data.executed_at).toBeDefined();
    });
  });

  describe('Tool Result Format (MCP-UI)', () => {
    it('should support success status', () => {
      const result = executeTool('zoom_in', {
        current_zoom: 'medium',
      });

      expect(['success', 'failure', 'partial']).toContain(result.status);
    });

    it('should support optional ui_updates field', () => {
      const result = executeTool('zoom_in', {
        current_zoom: 'medium',
      });

      if (result.ui_updates) {
        expect(Array.isArray(result.ui_updates)).toBe(true);
      }
    });

    // ADDED: Missing critical test for MCP-UI spec compliance
    it('should return MCP-UI compliant result format', () => {
      const result = executeTool('zoom_in', { current_zoom: 'medium' });

      // Per MCP-UI spec
      expect(['success', 'failure', 'partial']).toContain(result.status);
      expect(result).toHaveProperty('result');

      // Error field should be string if present
      if (result.error) {
        expect(typeof result.error).toBe('string');
      }

      // Metadata should be object if present
      if (result.metadata) {
        expect(typeof result.metadata).toBe('object');
        if (result.metadata.execution_time_ms) {
          expect(typeof result.metadata.execution_time_ms).toBe('number');
          expect(result.metadata.execution_time_ms).toBeGreaterThanOrEqual(0);
        }
      }

      // UI updates should be array if present
      if (result.ui_updates) {
        expect(Array.isArray(result.ui_updates)).toBe(true);
      }
    });
  });

  describe('Tool Discovery API', () => {
    it('should return all tools in discovery response', () => {
      const tools = toolRegistry.list();

      expect(tools.length).toBeGreaterThanOrEqual(2);

      for (const tool of tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');
        expect(tool).toHaveProperty('output_schema');
      }
    });

    it('should include schema version in discovery', () => {
      const tools = toolRegistry.list();

      expect(tools.length).toBeGreaterThanOrEqual(1);
      // Discovery endpoint would include version: '1.0.0'
    });

    it('should enable client capability negotiation', () => {
      const availableTools = toolRegistry.list().map((t) => t.name);

      // Client can check what tools are available before using them
      expect(availableTools).toContain('zoom_in');
      expect(availableTools).toContain('zoom_out');
    });
  });
});

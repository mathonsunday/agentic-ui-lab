/**
 * Terminal Types
 *
 * Type-safe definitions for terminal-related concepts.
 * Uses branded types to prevent accidental mixing of line IDs with regular strings.
 *
 * Branded types in TypeScript allow us to create distinct types based on primitives
 * while maintaining type safety at compile time. For example:
 *   type LineId = string & { readonly __brand: 'LineId' };
 *   const id: LineId = '5' as LineId; // OK
 *   const id: LineId = 'abc'; // TypeScript error at runtime
 */

/**
 * LineId: A type-safe wrapper around string for line identifiers
 * Prevents accidentally using regular strings where line IDs are expected
 */
export type LineId = string & { readonly __brand: 'LineId' };

/**
 * Create a type-safe LineId from a number
 */
export function createLineId(num: number): LineId {
  return String(num) as LineId;
}

/**
 * Parse a LineId back to a number
 */
export function parseLineId(id: LineId): number {
  return parseInt(id, 10);
}

/**
 * Terminal line types
 */
export type TerminalLineType = 'ascii' | 'text' | 'input' | 'system';

/**
 * A single line in the terminal display
 */
export interface TerminalLine {
  id: LineId;
  type: TerminalLineType;
  content: string;
  timestamp?: number;
}

/**
 * Response metadata for tracking animation state
 */
export interface ResponseLineMetadata {
  lineId: LineId;
  isAnimating: boolean;
  isComplete: boolean;
  startedAt?: number;
  completedAt?: number;
}

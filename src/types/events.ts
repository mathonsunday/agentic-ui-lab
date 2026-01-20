/**
 * AG-UI Event Protocol Types
 *
 * Structured event envelopes with correlation, versioning, and acknowledgment support.
 * Enables protocol compatibility with AG-UI, MCP-UI, and similar standards.
 */

/**
 * Event envelope wrapping all streaming events with metadata for correlation and replay.
 *
 * Supports:
 * - Event correlation (parent_event_id chains events together)
 * - Ordering (sequence_number for reordering out-of-order arrivals)
 * - Versioning (schema_version for protocol evolution)
 * - Replay (server can resend on reconnect)
 */
export interface EventEnvelope<T = unknown> {
  /** Unique event ID for correlation and acknowledgment */
  event_id: string;

  /** Protocol version for this event schema */
  schema_version: string;

  /** Event type discriminator for type-safe handling */
  type: EventType;

  /** ISO timestamp when event was created */
  timestamp: number;

  /** Sequence number for ordering events */
  sequence_number: number;

  /** Parent event ID for causality chains (e.g., TEXT_MESSAGE_START -> CONTENT -> END) */
  parent_event_id?: string;

  /** Context about what triggered this event */
  context?: Record<string, unknown>;

  /** The actual event payload, discriminated by type */
  data: T;
}

/**
 * Union of all possible event types following AG-UI conventions
 */
export type EventType =
  | 'TEXT_MESSAGE_START'
  | 'TEXT_CONTENT'
  | 'TEXT_MESSAGE_END'
  | 'RESPONSE_START'
  | 'RESPONSE_COMPLETE'
  | 'STATE_DELTA'
  | 'TOOL_CALL_START'
  | 'TOOL_CALL_RESULT'
  | 'TOOL_CALL_END'
  | 'ERROR'
  | 'ACK'
  | 'ANALYSIS_COMPLETE';



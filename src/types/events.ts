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

/**
 * Text message start event - begins a streaming text response
 */
export interface TextMessageStartData {
  /** The ID for this message sequence (same parent_event_id for all chunks) */
  message_id: string;
  /** Optional source identifier for the stream (e.g., 'specimen_47', 'normal_response') */
  source?: string;
}

/**
 * Text content event - a chunk of text from the message
 */
export interface TextContentData {
  /** The text chunk */
  chunk: string;
  /** Index of this chunk in the message (0-based) */
  chunk_index: number;
}

/**
 * Text message end event - completes a streaming text response
 */
export interface TextMessageEndData {
  /** Total chunks sent in this message */
  total_chunks: number;
}

/**
 * Response start event - signals analysis is beginning with initial metrics
 * Fired immediately when Claude analysis is received, before detailed analysis/content
 */
export interface ResponseStartData {
  /** Initial confidence delta from analysis */
  confidenceDelta: number;

  /** Current confidence value after applying delta */
  confidence: number;

  /** Initial personality metrics from early analysis */
  metrics?: {
    thoughtfulness: number;
    adventurousness: number;
    engagement: number;
    curiosity: number;
    superficiality: number;
  };

  /** Whether more detailed analysis is coming */
  hasAnalysisFollowing: boolean;
}

/**
 * Response complete event - signals full response completion with final state
 * Triggers UI transitions like ASCII art display and transition phrases
 * Includes consolidated analysis data for mood-based creature selection
 */
export interface ResponseCompleteData {
  /** Final updated state after response processing */
  updatedState: Record<string, unknown>;

  /** The complete agent response object */
  response: Record<string, unknown>;

  /** Optional analysis data (consolidated from ANALYSIS_COMPLETE event) */
  analysis?: {
    /** Claude's reasoning about the user's message */
    reasoning: string;
    /** How much confidence changed */
    confidenceDelta: number;
    /** Personality metrics evaluated by Claude */
    metrics: {
      thoughtfulness: number;
      adventurousness: number;
      engagement: number;
      curiosity: number;
      superficiality: number;
    };
    /** Suggested mood for creature selection */
    suggested_creature_mood?: string;
  };
}

/**
 * State delta event - partial state update (JSON Patch format RFC 6902)
 */
export interface StateDeltaData {
  /** State version after this update */
  version: number;

  /** Timestamp of state update */
  timestamp: number;

  /** JSON Patch operations describing state changes */
  operations: Array<{
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
    path: string;
    value?: unknown;
    from?: string;
  }>;

  /** Full state for initial sync or large changes */
  full_state?: Record<string, unknown>;
}

/**
 * Tool call start event - begins a tool invocation
 */
export interface ToolCallStartData {
  /** Unique ID for this tool call */
  tool_call_id: string;

  /** Name of the tool being called */
  tool_name: string;

  /** Arguments passed to the tool */
  arguments: Record<string, unknown>;
}

/**
 * Tool call result event - tool execution completed
 */
export interface ToolCallResultData {
  /** Which tool call this result is for */
  tool_call_id: string;

  /** Status of tool execution */
  status: 'success' | 'failure' | 'partial';

  /** The result data */
  result: unknown;

  /** Any error message if status is 'failure' */
  error?: string;
}

/**
 * Tool call end event - completes tool invocation sequence
 */
export interface ToolCallEndData {
  /** Which tool call is ending */
  tool_call_id: string;

  /** Total results sent (e.g., streaming results) */
  total_results: number;
}

/**
 * Error event - something went wrong
 */
export interface ErrorData {
  /** Error code for client handling */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Whether the connection is still valid */
  recoverable: boolean;
}

/**
 * Acknowledgment event - client received an event
 */
export interface AckData {
  /** Event ID being acknowledged */
  event_id: string;
}

/**
 * Analysis complete event - Claude's analysis of user input
 */
export interface AnalysisCompleteData {
  /** Claude's reasoning about the user's message */
  reasoning: string;

  /** Personality metrics evaluated by Claude */
  metrics: {
    thoughtfulness: number;
    adventurousness: number;
    engagement: number;
    curiosity: number;
    superficiality: number;
  };

  /** How much confidence changed (delta) */
  confidenceDelta: number;

  /** Suggested mood for mood-based creature selection (from toolkit metadata) */
  suggested_creature_mood?: string;
}


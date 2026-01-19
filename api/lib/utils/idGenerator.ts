/**
 * Shared ID generation utilities
 * Centralizes event and stream ID generation logic to avoid duplication
 */

/**
 * Generate a unique event ID for AG-UI event envelopes
 * Format: evt_<timestamp>_<random>
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique stream ID for tracking streaming sessions
 * Format: stream_<timestamp>_<random>
 */
export function generateStreamId(): string {
  return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

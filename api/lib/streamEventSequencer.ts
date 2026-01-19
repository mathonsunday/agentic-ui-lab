/**
 * SSE Event Sequencer for Streaming Responses
 *
 * Encapsulates the complex logic of generating and sending AG-UI compatible
 * SSE events in the correct order with proper event IDs, sequence numbers,
 * and parent event correlation.
 *
 * Extracted from analyze-user-stream.ts (~200 LoC reduction)
 *
 * ===== AG-UI EVENT ARCHITECTURE =====
 *
 * This module produces Server-Sent Events in the AG-UI format, an envelope-based
 * protocol designed for streaming interactions with correlation IDs and ordering.
 *
 * EVENT FORMAT:
 * Each event is a JSON object wrapped in SSE data: prefix
 * ```
 * data: {"event_id":"evt_...", "type":"TEXT_CONTENT", "sequence_number":0, ...}
 * ```
 *
 * EVENT TYPES AND FLOW:
 *
 * 1. TEXT_MESSAGE_START - Signals start of message streaming
 *    - sent: When streaming begins
 *    - contains: message_id (unique identifier), source (event origin)
 *    - sources: "specimen_47" (hardcoded content), "claude_streaming" (Claude output), "tool_call" (tool interaction)
 *    - frontend uses: Identifies message stream for UI updates and interrupt eligibility
 *
 * 2. TEXT_CONTENT - Character-by-character content chunks
 *    - sent: For each text_delta received from Claude or for each chunk of hardcoded content
 *    - contains: chunk (text), chunk_index (sequence number)
 *    - frontend uses: Drives typewriter animation
 *
 * 3. TEXT_MESSAGE_END - Signals end of message streaming
 *    - sent: When all content chunks have been sent
 *    - contains: total_chunks (for verification)
 *    - frontend uses: Completes animation, marks message as done
 *
 * 4. STATE_DELTA - Incremental state updates using JSON Patch format
 *    - sent: When non-confidence state properties change (e.g., userProfile)
 *    - contains: version, timestamp, operations (array of {op, path, value})
 *    - note: CONFIDENCE IS NOT SENT HERE - only in RESPONSE_COMPLETE
 *    - frontend uses: Updates specific state properties without reloading full state
 *
 * 5. RESPONSE_COMPLETE - Final authoritative state (SINGLE SOURCE OF TRUTH)
 *    - sent: At the end of streaming after all analysis is complete
 *    - contains: updatedState (full MiraState), response (AgentResponse), analysis (optional)
 *    - note: CONFIDENCE MUST BE PRESENT IN updatedState
 *    - frontend uses: Full state replacement, confidence updates ONLY from this event
 *    - critical: Interrupt-safety guard checks interrupt status before applying
 *
 * 6. ANALYSIS_COMPLETE - Claude's personality analysis results
 *    - sent: After Claude finishes analysis but before RESPONSE_COMPLETE
 *    - contains: reasoning (explanation), metrics (personality scores), confidenceDelta, suggested_creature_mood
 *    - frontend uses: Displays reasoning to user, selects ASCII creature based on mood
 *    - note: confidenceDelta is for display only, actual confidence comes from RESPONSE_COMPLETE
 *
 * 7. ERROR - Error notifications
 *    - sent: On any error during streaming
 *    - contains: code (error type), message (user-friendly), recoverable (boolean)
 *    - frontend uses: Shows error message, allows recovery if recoverable=true
 *
 * DESIGN PRINCIPLES:
 *
 * Single Source of Truth:
 * - Confidence is sent ONLY in RESPONSE_COMPLETE updatedState
 * - Frontend never updates confidence from STATE_DELTA or other events
 * - This prevents race conditions between incremental and full updates
 *
 * Frontend Logic Separation:
 * - Backend sends DATA, never formatted strings
 * - Frontend calculates display formatting (e.g., rapport bar animation)
 * - No presentation logic in backend (was removed from RAPPORT_UPDATE event)
 *
 * Event Ordering:
 * - Sequence numbers allow frontend to handle out-of-order delivery
 * - Parent event IDs create causality chains for correlation
 * - Frontend buffers and reorders using sequence numbers
 *
 * Interrupt Safety:
 * - When user interrupts, frontend blocks updates from interrupted stream
 * - Confidence penalty applied locally before stream completion
 * - Backend updates from interrupted streams are ignored
 *
 * Usage:
 * ```typescript
 * const sequencer = new StreamEventSequencer(response, eventTracker);
 * await sequencer.sendStateUpdate(newConfidence, profile);
 * await sequencer.sendAnalysis(reasoning, metrics, delta);
 * await sequencer.sendCompletion(finalState, response, analysis);
 * ```
 */

import type { VercelResponse } from '@vercel/node';
import type { MiraState, AgentResponse } from './types.js';

interface AnalysisMetrics {
  thoughtfulness: number;
  adventurousness: number;
  engagement: number;
  curiosity: number;
  superficiality: number;
}

/**
 * Event tracking interface - compatible with local EventSequence implementations
 */
interface IEventSequence {
  getNextSequence(): number;
  setFirstEventId?(id: string): void;
  getFirstEventId?(): string | undefined;
}

/**
 * AG-UI Event Envelope Format
 */
interface AGUIEvent {
  event_id: string;
  schema_version: string;
  type: string;
  timestamp: number;
  sequence_number: number;
  parent_event_id?: string;
  data: unknown;
}

/**
 * Stream Event Sequencer - Manages event generation and sending
 */
export class StreamEventSequencer {
  private response: VercelResponse;
  private eventTracker: IEventSequence;

  constructor(response: VercelResponse, eventTracker?: IEventSequence) {
    this.response = response;
    if (!eventTracker) {
      // Create a simple default event sequencer if none provided
      const sequence = { count: 0 };
      this.eventTracker = {
        getNextSequence: () => sequence.count++,
      };
    } else {
      this.eventTracker = eventTracker;
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send AG-UI formatted event envelope
   */
  private sendAGUIEvent(
    eventId: string,
    type: string,
    data: unknown,
    sequenceNumber: number,
    parentEventId?: string
  ): void {
    const envelope: AGUIEvent = {
      event_id: eventId,
      schema_version: '1.0.0',
      type,
      timestamp: Date.now(),
      sequence_number: sequenceNumber,
      parent_event_id: parentEventId,
      data,
    };

    this.response.write(`data: ${JSON.stringify(envelope)}\n\n`);
  }

  /**
   * Send RESPONSE_START event - signals analysis beginning with confidence delta
   * Fired immediately when Claude analysis is received, before detailed content
   */
  async sendResponseStart(
    confidenceDelta: number,
    metrics?: AnalysisMetrics,
    hasAnalysisFollowing: boolean = true
  ): Promise<void> {
    const startEventId = this.generateEventId();
    const startSequence = this.eventTracker.getNextSequence();

    this.sendAGUIEvent(startEventId, 'RESPONSE_START', {
      confidenceDelta,
      metrics: metrics ? {
        thoughtfulness: metrics.thoughtfulness,
        adventurousness: metrics.adventurousness,
        engagement: metrics.engagement,
        curiosity: metrics.curiosity,
        superficiality: metrics.superficiality,
      } : undefined,
      hasAnalysisFollowing,
    }, startSequence);
  }

  /**
   * Send STATE_DELTA event with confidence and profile updates
   */
  async sendStateUpdate(
    newConfidence: number,
    metrics: AnalysisMetrics
  ): Promise<void> {
    const stateEventId = this.generateEventId();
    const stateSequence = this.eventTracker.getNextSequence();

    this.sendAGUIEvent(stateEventId, 'STATE_DELTA', {
      version: 1,
      timestamp: Date.now(),
      operations: [
        {
          op: 'replace',
          path: '/userProfile',
          value: {
            thoughtfulness: metrics.thoughtfulness,
            adventurousness: metrics.adventurousness,
            engagement: metrics.engagement,
            curiosity: metrics.curiosity,
            superficiality: metrics.superficiality,
          },
        },
      ],
    }, stateSequence);
  }

  /**
   * Send ANALYSIS_COMPLETE event with reasoning and metrics
   */
  async sendAnalysis(
    reasoning: string,
    metrics: AnalysisMetrics,
    confidenceDelta: number,
    suggestedCreatureMood?: string
  ): Promise<void> {
    const analysisEventId = this.generateEventId();
    const analysisSequence = this.eventTracker.getNextSequence();

    console.log('📊 [Backend] Sending ANALYSIS_COMPLETE event:', {
      analysisEventId,
      analysisSequence,
      reasoning: reasoning.substring(0, 50),
      confidenceDelta,
      suggestedCreatureMood,
    });

    this.sendAGUIEvent(analysisEventId, 'ANALYSIS_COMPLETE', {
      reasoning,
      metrics: {
        thoughtfulness: metrics.thoughtfulness,
        adventurousness: metrics.adventurousness,
        engagement: metrics.engagement,
        curiosity: metrics.curiosity,
        superficiality: metrics.superficiality,
      },
      confidenceDelta,
      suggested_creature_mood: suggestedCreatureMood,
    }, analysisSequence);
  }

  /**
   * Send RESPONSE_COMPLETE event with final state and optional analysis data
   */
  async sendCompletion(
    finalState: MiraState,
    response: AgentResponse,
    analysis?: {
      reasoning: string;
      confidenceDelta: number;
      metrics: AnalysisMetrics;
      suggested_creature_mood?: string;
    }
  ): Promise<void> {
    const completeEventId = this.generateEventId();
    const completeSequence = this.eventTracker.getNextSequence();

    this.sendAGUIEvent(completeEventId, 'RESPONSE_COMPLETE', {
      updatedState: finalState,
      response,
      analysis,
    }, completeSequence);
  }

  /**
   * Send ERROR event
   */
  async sendError(
    code: string,
    message: string,
    recoverable: boolean = false
  ): Promise<void> {
    const errorId = this.generateEventId();
    const errorSequence = this.eventTracker.getNextSequence();

    this.sendAGUIEvent(errorId, 'ERROR', {
      code,
      message,
      recoverable,
    }, errorSequence);
  }

  /**
   * Send RESPONSE_COMPLETE for tool call (silent rapport update only)
   *
   * Tool calls update confidence silently with no user-facing dialogue.
   * Confidence is sent only in RESPONSE_COMPLETE (single source of truth).
   */
  async sendToolCallCompletion(
    updatedState: MiraState
  ): Promise<void> {
    // Send completion event with full updated state
    const completeEventId = this.generateEventId();
    const completeSequence = this.eventTracker.getNextSequence();
    this.sendAGUIEvent(completeEventId, 'RESPONSE_COMPLETE', {
      updatedState,
      response: {
        streaming: [],
        text: '',
        source: 'tool_call',
      },
    }, completeSequence);
  }
}

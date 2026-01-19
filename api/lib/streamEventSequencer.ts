/**
 * SSE Event Sequencer for Streaming Responses
 *
 * Encapsulates the complex logic of generating and sending AG-UI compatible
 * SSE events in the correct order with proper event IDs, sequence numbers,
 * and parent event correlation.
 *
 * Extracted from analyze-user-stream.ts (~200 LoC reduction)
 *
 * Usage:
 * ```typescript
 * const sequencer = new StreamEventSequencer(response, eventTracker);
 * await sequencer.sendStateUpdate(confidence, profile);
 * await sequencer.sendRapportBar(confidence);
 * await sequencer.sendAnalysis(reasoning, metrics, delta);
 * await sequencer.sendCompletion(finalState, response);
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
          path: '/confidenceInUser',
          value: newConfidence,
        },
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
   * Send RAPPORT_UPDATE event with confidence change
   * Semantically separates state metadata from display text
   * This prevents the confusion that occurred when rapport bar was sent as TEXT_CONTENT
   */
  async sendRapportUpdate(
    confidence: number,
    formattedBar: string
  ): Promise<void> {
    const eventId = this.generateEventId();
    const sequence = this.eventTracker.getNextSequence();

    this.sendAGUIEvent(eventId, 'RAPPORT_UPDATE', {
      confidence,
      formatted_bar: formattedBar,
    }, sequence);
  }

  /**
   * Send rapport bar as a complete TEXT_MESSAGE sequence
   * DEPRECATED: Use sendRapportUpdate() instead for semantic clarity
   */
  async sendRapportBar(confidenceBar: string): Promise<void> {
    const rapportMessageId = `msg_rapport_${Date.now()}`;
    const rapportStartEventId = this.generateEventId();
    const rapportStartSequence = this.eventTracker.getNextSequence();

    // TEXT_MESSAGE_START
    this.sendAGUIEvent(rapportStartEventId, 'TEXT_MESSAGE_START', {
      message_id: rapportMessageId,
    }, rapportStartSequence);

    // TEXT_CONTENT (rapport bar as single chunk)
    const barChunkId = this.generateEventId();
    const barChunkSeq = this.eventTracker.getNextSequence();
    this.sendAGUIEvent(barChunkId, 'TEXT_CONTENT', {
      chunk: confidenceBar,
      chunk_index: 0,
    }, barChunkSeq, rapportStartEventId);

    // TEXT_MESSAGE_END
    const rapportEndEventId = this.generateEventId();
    const rapportEndSequence = this.eventTracker.getNextSequence();
    this.sendAGUIEvent(rapportEndEventId, 'TEXT_MESSAGE_END', {
      total_chunks: 1,
    }, rapportEndSequence, rapportStartEventId);
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
   */
  async sendToolCallCompletion(
    updatedState: MiraState
  ): Promise<void> {
    // Send state delta with confidence update
    const stateEventId = this.generateEventId();
    const stateSequence = this.eventTracker.getNextSequence();
    this.sendAGUIEvent(stateEventId, 'STATE_DELTA', {
      version: 1,
      timestamp: Date.now(),
      operations: [
        {
          op: 'replace',
          path: '/confidenceInUser',
          value: updatedState.confidenceInUser,
        },
      ],
    }, stateSequence);

    // Send completion event to signal end of stream
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

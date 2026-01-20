/**
 * useStreamingSession Hook
 *
 * Consolidates all streaming session state management into a single cohesive unit.
 * Replaces 7+ scattered refs with encapsulated methods and a clear interface.
 *
 * Design philosophy:
 * - Dual state+ref pattern: state for re-renders, ref for performance-critical paths
 * - Encapsulated getters/setters instead of exposing refs directly
 * - Per-stream interrupt tracking to prevent cross-stream contamination
 * - All methods wrapped with useCallback for stable references
 *
 * This prevents bugs like the "specimen 47" regression where the INTERRUPT button
 * disappeared because a ref was read in useMemo without triggering re-renders.
 */

import { useRef, useState, useCallback } from 'react';

export interface UseStreamingSessionReturn {
  // Session state (triggers re-renders)
  streamSource: string | null;

  // Session control
  startSession: (source?: string) => void;
  endSession: () => void;

  // Line tracking
  getCurrentLineId: () => string | null;
  setCurrentLineId: (id: string) => void;
  clearCurrentLine: () => void;
  trackResponseLine: (id: string) => void;
  getResponseLineIds: () => string[];
  clearResponseLines: () => void;

  // Animation tracking (for interrupts)
  getRevealedLength: () => number;
  setRevealedLength: (length: number) => void;
  getContentLength: () => number;
  setContentLength: (length: number) => void;

  // Interrupt support
  markAsInterrupted: (streamId: number) => void;
  wasInterrupted: (streamId: number) => boolean;
  clearInterruptState: () => void;

  // Internal ref access (for performance-critical paths in callbacks)
  streamSourceRef: React.MutableRefObject<string | null>;
}

/**
 * Hook managing all streaming session state
 *
 * Maintains both state (for re-renders) and refs (for performance) where needed.
 * All methods are useCallback-wrapped to provide stable references.
 */
export function useStreamingSession(): UseStreamingSessionReturn {
  // Session state: streamSource must be state (not just ref) so UI logic dependent on it triggers re-renders
  const [streamSource, setStreamSource] = useState<string | null>(null);

  // Internal refs for tracking (accessible without recreating methods)
  const streamSourceRef = useRef<string | null>(null);
  const currentAnimatingLineIdRef = useRef<string | null>(null);
  const currentRevealedLengthRef = useRef(0);
  const currentAnimatingContentLengthRef = useRef(0);
  const responseLineIdsRef = useRef<string[]>([]);
  const interruptedStreamIdRef = useRef<number | null>(null);

  /**
   * Start a new streaming session
   * Updates both state (for re-renders) and ref (for performance)
   */
  const startSession = useCallback((source?: string) => {
    const newSource = source || null;
    streamSourceRef.current = newSource;
    setStreamSource(newSource);
  }, []);

  /**
   * End the current streaming session
   */
  const endSession = useCallback(() => {
    streamSourceRef.current = null;
    setStreamSource(null);
  }, []);

  /**
   * Get the ID of the line currently being animated
   */
  const getCurrentLineId = useCallback(() => {
    return currentAnimatingLineIdRef.current;
  }, []);

  /**
   * Set the ID of the line currently being animated
   */
  const setCurrentLineId = useCallback((id: string) => {
    currentAnimatingLineIdRef.current = id;
  }, []);

  /**
   * Clear the current line tracking
   */
  const clearCurrentLine = useCallback(() => {
    currentAnimatingLineIdRef.current = null;
  }, []);

  /**
   * Track that a line is part of the response
   */
  const trackResponseLine = useCallback((id: string) => {
    responseLineIdsRef.current.push(id);
  }, []);

  /**
   * Get all response line IDs
   */
  const getResponseLineIds = useCallback(() => {
    return responseLineIdsRef.current;
  }, []);

  /**
   * Clear all response line tracking
   */
  const clearResponseLines = useCallback(() => {
    responseLineIdsRef.current = [];
  }, []);

  /**
   * Get the current revealed length for animation tracking
   * Used to know where to truncate when interrupt occurs
   */
  const getRevealedLength = useCallback(() => {
    return currentRevealedLengthRef.current;
  }, []);

  /**
   * Set the current revealed length
   */
  const setRevealedLength = useCallback((length: number) => {
    currentRevealedLengthRef.current = length;
  }, []);

  /**
   * Get the total content length of the animating line
   */
  const getContentLength = useCallback(() => {
    return currentAnimatingContentLengthRef.current;
  }, []);

  /**
   * Set the total content length
   */
  const setContentLength = useCallback((length: number) => {
    currentAnimatingContentLengthRef.current = length;
  }, []);

  /**
   * Mark a specific stream as interrupted
   * This prevents cross-stream contamination where one stream's interrupt
   * affects another stream's message processing
   */
  const markAsInterrupted = useCallback((streamId: number) => {
    interruptedStreamIdRef.current = streamId;
  }, []);

  /**
   * Check if a specific stream was interrupted
   * Returns true only if the streamId matches the interrupted stream
   */
  const wasInterrupted = useCallback((streamId: number) => {
    return interruptedStreamIdRef.current === streamId;
  }, []);

  /**
   * Clear interrupt state for the next stream
   */
  const clearInterruptState = useCallback(() => {
    interruptedStreamIdRef.current = null;
  }, []);

  return {
    streamSource,
    startSession,
    endSession,
    getCurrentLineId,
    setCurrentLineId,
    clearCurrentLine,
    trackResponseLine,
    getResponseLineIds,
    clearResponseLines,
    getRevealedLength,
    setRevealedLength,
    getContentLength,
    setContentLength,
    markAsInterrupted,
    wasInterrupted,
    clearInterruptState,
    streamSourceRef,
  };
}

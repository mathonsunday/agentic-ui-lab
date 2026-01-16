/**
 * Interaction Tracker
 * Tracks user interactions for Context Enrichment (AG-UI Feature #4)
 * Records what Dr. Petrovic observes about the user's exploration
 */

export interface Interaction {
  elementId: string;
  type: 'hover' | 'click';
  timestamp: number;
  duration?: number; // How long user hovered
}

export interface InteractionContext {
  hoveredElement: string | null;
  clickedElement: string | null;
  focusHistory: Interaction[];
  timeSpentPerElement: Record<string, number>;
  lastInteractionTime: number | null;
}

export function createInitialContext(): InteractionContext {
  return {
    hoveredElement: null,
    clickedElement: null,
    focusHistory: [],
    timeSpentPerElement: {},
    lastInteractionTime: null,
  };
}

/**
 * Track when user hovers over an element
 */
export function trackHover(
  context: InteractionContext,
  elementId: string
): InteractionContext {
  const now = Date.now();

  // Update time spent on previously hovered element
  if (context.hoveredElement && context.hoveredElement !== elementId) {
    const prevElement = context.hoveredElement;
    const timeSpent = now - (context.lastInteractionTime || now);
    context.timeSpentPerElement[prevElement] =
      (context.timeSpentPerElement[prevElement] || 0) + timeSpent;
  }

  return {
    ...context,
    hoveredElement: elementId,
    lastInteractionTime: now,
    focusHistory: [
      ...context.focusHistory,
      { elementId, type: 'hover' as const, timestamp: now },
    ].slice(-20), // Keep last 20 interactions
  };
}

/**
 * Track when user clicks on an element
 */
export function trackClick(
  context: InteractionContext,
  elementId: string
): InteractionContext {
  const now = Date.now();

  return {
    ...context,
    clickedElement: elementId,
    lastInteractionTime: now,
    focusHistory: [
      ...context.focusHistory,
      { elementId, type: 'click' as const, timestamp: now },
    ].slice(-20),
  };
}

/**
 * Generate Dr. Petrovic's reaction to what she observes
 * Returns a thought fragment based on what user is interacting with
 */
export function generateContextReaction(context: InteractionContext): string | null {
  if (!context.hoveredElement && !context.clickedElement) {
    return null;
  }

  const focused = context.clickedElement || context.hoveredElement;
  if (!focused) return null;

  // Map element IDs to Mira's observations
  const reactions: Record<string, string[]> = {
    'creature-seeker': [
      '...you see it too, the seeker...',
      '...it moves with intention...',
      '...drawn to light, drawn to knowledge...',
    ],
    'creature-tendril': [
      '...the tendrils reach deeper...',
      '...feeling the pressure...',
      '...they sense our presence...',
    ],
    'creature-leviathan-eye': [
      '...you found it...the leviathan...',
      '...those eyes, always watching...',
      '...47 is always watching...',
    ],
    'creature-jellyfish': [
      '...the jellies drift without intention...',
      '...bioluminescent, beautiful...',
      '...they belong down here...',
    ],
    'text-depth': [
      '...the pressure at this depth...',
      '...crushing, but survivable...',
      '...we adapt...',
    ],
    'text-mood': [
      '...you notice how the light changes...',
      '...the atmosphere shifts with mood...',
      '...everything is connected...',
    ],
    'thinking-stream': [
      '...you listen to my thoughts...',
      '...do they make sense from the outside?...',
      '...sometimes I wonder too...',
    ],
  };

  const possibleReactions = reactions[focused] || [
    '...you\'re looking at something...',
    '...I see what interests you...',
  ];

  return possibleReactions[Math.floor(Math.random() * possibleReactions.length)];
}

/**
 * Check if user has been focused on a specific element for a while
 */
export function hasLongFocus(
  context: InteractionContext,
  elementId: string,
  minDuration: number = 2000 // 2 seconds
): boolean {
  const now = Date.now();
  if (context.hoveredElement !== elementId) {
    return false;
  }
  const timeSpent = now - (context.lastInteractionTime || now);
  return timeSpent >= minDuration;
}

/**
 * Get recently interacted elements (for debugging/context display)
 */
export function getRecentInteractions(
  context: InteractionContext,
  limit: number = 5
): Interaction[] {
  return context.focusHistory.slice(-limit);
}

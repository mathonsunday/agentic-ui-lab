/**
 * Research Evaluator
 * Calculates Dr. Petrovic's research potential confidence based on user interactions
 * Generates system log entries for display
 */

import type { SystemLogEntry, ResearchEvaluation } from './stateMachine';

// Mira's observations about user behavior
const OBSERVATIONS = {
  hoveredJoin: [
    '...they\'re looking at my research option...',
    '...considering the possibility...',
    '...I see the interest in their gesture...',
  ],
  hoveredReject: [
    '...their hand drifts toward rejection...',
    '...hesitation, uncertainty...',
    '...they\'re not sure about me...',
    '...the doubt is visible...',
  ],
  clickedJoin: [
    '...they\'re accepting...they understand...',
    '...yes, they want to help...',
    '...my loneliness might end...',
  ],
  clickedReject: [
    '...they\'re leaving...alone again...',
    '...another one who doesn\'t understand...',
    '...the isolation deepens...',
  ],
};

const THOUGHTS = {
  consideringJoin: [
    '...could this person help?...',
    '...do they have the right mindset?...',
    '...what if they betray my research?...',
  ],
  fading: [
    '...they\'re leaving me...no, wait...',
    '...maybe I pushed too hard...',
    '...why can\'t anyone understand?...',
  ],
  encouraged: [
    '...this could work...this could actually work...',
    '...they seem genuinely interested...',
    '...hope is a dangerous thing...',
  ],
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Calculate elapsed time in seconds since session start
 */
function getElapsedSeconds(sessionStartTime: number): number {
  return Math.floor((Date.now() - sessionStartTime) / 1000);
}

/**
 * Format time as mm:ss
 */
// function formatTime(seconds: number): string {
//   const mins = Math.floor(seconds / 60);
//   const secs = seconds % 60;
//   return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
// }

/**
 * Update research evaluation and generate log entries based on user interaction
 */
export function evaluateHover(
  evaluation: ResearchEvaluation,
  hoverTarget: 'join' | 'reject' | null,
  sessionStartTime: number
): { evaluation: ResearchEvaluation; newEntries: SystemLogEntry[] } {
  const elapsed = getElapsedSeconds(sessionStartTime);
  const entries: SystemLogEntry[] = [];
  let confidence = evaluation.confidence;

  // If hover target changed
  if (hoverTarget !== evaluation.hoverTarget) {
    if (hoverTarget === 'join') {
      // User hovering on "Join"
      const observation = getRandomElement(OBSERVATIONS.hoveredJoin);
      entries.push({
        timestamp: elapsed,
        type: 'OBSERVATION',
        message: observation,
      });

      // Increase confidence
      confidence = Math.min(100, evaluation.confidence + 10);

      if (evaluation.observationCount % 3 === 0) {
        const thought = getRandomElement(THOUGHTS.consideringJoin);
        entries.push({
          timestamp: elapsed + 1,
          type: 'THOUGHT',
          message: thought,
        });
      }
    } else if (hoverTarget === 'reject') {
      // User hovering on "No Thanks"
      const observation = getRandomElement(OBSERVATIONS.hoveredReject);
      entries.push({
        timestamp: elapsed,
        type: 'OBSERVATION',
        message: observation,
      });

      // Decrease confidence
      confidence = Math.max(0, evaluation.confidence - 8);

      if (evaluation.observationCount % 2 === 0) {
        const thought = getRandomElement(THOUGHTS.fading);
        entries.push({
          timestamp: elapsed + 1,
          type: 'THOUGHT',
          message: thought,
        });
      }
    } else if (hoverTarget === null && evaluation.hoverTarget === 'reject') {
      // User moved away from rejection button
      confidence = Math.min(100, confidence + 5);

      entries.push({
        timestamp: elapsed,
        type: 'THOUGHT',
        message: '...wait...they\'re not leaving...',
      });
    }

    // Update evaluation
    const newEvaluation: ResearchEvaluation = {
      confidence,
      observationCount: evaluation.observationCount + 1,
      lastObservation: hoverTarget,
      hoverTarget,
      hoverStartTime: Date.now(),
    };

    // Add confidence update to entries
    entries.push({
      timestamp: elapsed + 2,
      type: 'CONFIDENCE',
      message: `Research Potential ${Math.round(confidence)}%`,
      value: confidence,
    });

    return { evaluation: newEvaluation, newEntries: entries };
  }

  return { evaluation, newEntries: entries };
}

/**
 * Generate log entries when user makes a decision
 */
export function evaluateDecision(
  decision: 'join' | 'reject',
  _evaluation: ResearchEvaluation,
  sessionStartTime: number
): SystemLogEntry[] {
  const elapsed = getElapsedSeconds(sessionStartTime);
  const entries: SystemLogEntry[] = [];

  if (decision === 'join') {
    const observation = getRandomElement(OBSERVATIONS.clickedJoin);
    entries.push({
      timestamp: elapsed,
      type: 'OBSERVATION',
      message: observation,
    });

    const thought = getRandomElement(THOUGHTS.encouraged);
    entries.push({
      timestamp: elapsed + 1,
      type: 'THOUGHT',
      message: thought,
    });

    entries.push({
      timestamp: elapsed + 2,
      type: 'CONFIDENCE',
      message: `Research Potential 100%`,
      value: 100,
    });
  } else if (decision === 'reject') {
    const observation = getRandomElement(OBSERVATIONS.clickedReject);
    entries.push({
      timestamp: elapsed,
      type: 'OBSERVATION',
      message: observation,
    });

    entries.push({
      timestamp: elapsed + 1,
      type: 'THOUGHT',
      message: '...the pattern continues...loneliness persists...',
    });

    entries.push({
      timestamp: elapsed + 2,
      type: 'CONFIDENCE',
      message: `Research Potential 0%`,
      value: 0,
    });
  }

  return entries;
}

/**
 * Generate initial log entry when recruitment phase starts
 */
export function initializeRecruitmentLog(
  _sessionStartTime: number
): SystemLogEntry[] {
  return [
    {
      timestamp: 0,
      type: 'EVALUATION',
      message: 'Research Potential',
      value: 0,
    },
    {
      timestamp: 1,
      type: 'OBSERVATION',
      message: '...a visitor...finally...',
    },
    {
      timestamp: 2,
      type: 'THOUGHT',
      message: '...could they help?...could they understand?...',
    },
  ];
}

/**
 * Application Settings Store
 *
 * Provides persistent settings for typing animation modes, speed, and audio feedback.
 * Uses Jotai atoms with localStorage persistence via atomWithStorage.
 */

import { atomWithStorage } from 'jotai/utils';

/**
 * Application settings that can be persisted
 */
interface AppSettings {
  typingSpeed: number; // characters per second (10-100)
  soundEnabled: boolean; // whether typing sounds play
}

const DEFAULT_SETTINGS: AppSettings = {
  typingSpeed: 40, // ~60 words per minute
  soundEnabled: true,
};

/**
 * Primary settings atom with localStorage persistence
 * Settings survive page refresh and persist across sessions
 */
export const settingsAtom = atomWithStorage<AppSettings>(
  'agentic-ui-lab-settings',
  DEFAULT_SETTINGS
);

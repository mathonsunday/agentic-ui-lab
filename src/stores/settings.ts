/**
 * Application Settings Store
 *
 * Provides persistent settings for typing animation modes, speed, and audio feedback.
 * Uses Jotai atoms with localStorage persistence via atomWithStorage.
 */

import { atomWithStorage } from 'jotai/utils';

/**
 * Typing mode determines how text appears on screen
 * - 'instant': All text appears immediately
 * - 'character': Text reveals one character at a time
 * - 'line': Text reveals one visual line at a time
 */
export type TypingMode = 'character' | 'line' | 'instant';

/**
 * Application settings that can be persisted
 */
export interface AppSettings {
  typingMode: TypingMode;
  typingSpeed: number; // characters per second (10-100)
  soundEnabled: boolean; // whether typing sounds play
}

const DEFAULT_SETTINGS: AppSettings = {
  typingMode: 'character',
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

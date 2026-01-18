/**
 * Type definitions for system prompt sections
 * Used by systemPromptBuilder to compose prompts from reusable components
 */

export interface PromptSection {
  title: string;
  content: string;
  order: number; // Controls section ordering in final prompt
}

export type PersonalityTier = 'negative' | 'chaotic' | 'glowing';

export interface PersonalityTierDefinition {
  name: PersonalityTier;
  examples: string[];
  keyTraits: string;
}

export interface ScoringLevel {
  name: string;
  range: [number, number];
  description: string;
  examples: string[];
}

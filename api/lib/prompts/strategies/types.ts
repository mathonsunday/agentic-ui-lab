/**
 * Provider-agnostic prompt ordering strategies
 *
 * Different LLM providers have different optimal prompt structures:
 * - Claude: Emphasizes end-of-prompt content; benefits from detailed examples upfront
 * - OpenAI GPT: Needs explicit delimiters; requires precise output format early
 * - Google Gemini: Benefits from XML tags and few-shot examples; prefers explicit research scope
 *
 * This module allows switching between provider-specific ordering strategies
 * without changing application logic.
 */

export type LLMProvider = 'claude' | 'openai-gpt' | 'google-gemini';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Defines how prompt sections should be ordered for a specific LLM provider.
 * Each provider can have different optimal section ordering based on
 * their training and architectural preferences.
 */
export interface PromptOrderingStrategy {
  /**
   * The LLM provider this strategy optimizes for
   */
  readonly provider: LLMProvider;

  /**
   * Get the sort order for a specific section key.
   * Unknown sections are assigned order 999 (end of prompt).
   */
  getOrder(sectionKey: string): number;

  /**
   * Validate that the strategy has no duplicate order values.
   * Returns array of errors (empty array = valid).
   */
  validate(): ValidationError[];

  /**
   * Human-readable description of this strategy and why it's ordered this way
   */
  getDescription(): string;

  /**
   * Get all known section keys and their order values
   */
  getOrderMapping(): Record<string, number>;
}

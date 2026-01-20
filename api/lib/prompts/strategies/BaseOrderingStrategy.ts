/**
 * Base implementation of PromptOrderingStrategy
 *
 * Provides common validation logic and helper methods.
 * Subclasses define their specific section ordering.
 */

import type { PromptOrderingStrategy, ValidationError, LLMProvider } from './types.js';

export abstract class BaseOrderingStrategy implements PromptOrderingStrategy {
  abstract readonly provider: LLMProvider;

  /**
   * Subclasses must define their section ordering
   */
  protected abstract readonly sectionOrdering: Record<string, number>;

  getOrder(sectionKey: string): number {
    // Unknown sections sort to end (order 999)
    return this.sectionOrdering[sectionKey] ?? 999;
  }

  validate(): ValidationError[] {
    const errors: ValidationError[] = [];
    const orderCounts = new Map<number, string[]>();

    // Group sections by order value
    Object.entries(this.sectionOrdering).forEach(([sectionKey, order]) => {
      const sections = orderCounts.get(order) ?? [];
      sections.push(sectionKey);
      orderCounts.set(order, sections);
    });

    // Find duplicates
    orderCounts.forEach((sections, order) => {
      if (sections.length > 1) {
        errors.push({
          field: `order_${order}`,
          message: `Duplicate order value ${order} for sections: ${sections.join(', ')}. Each section must have a unique order value.`,
        });
      }
    });

    return errors;
  }

  getOrderMapping(): Record<string, number> {
    return { ...this.sectionOrdering };
  }

  abstract getDescription(): string;
}

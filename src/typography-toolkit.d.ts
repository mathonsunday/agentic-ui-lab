declare module 'typography-toolkit' {
  export interface TypographyOptions {
    [key: string]: any;
  }

  export class AnimatedText {
    constructor(options: {
      text: string;
      container: HTMLElement;
      [key: string]: any;
    });
    render(): void;
    destroy(): void;
  }

  export function initTypography(options?: TypographyOptions): void;
  export function getTypography(): any;
  export function applyTypography(element: HTMLElement): void;
}

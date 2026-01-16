import { useEffect, useRef } from 'react';
import { AnimatedText } from 'typography-toolkit';
import './FloatingText.css';

interface FloatingTextProps {
  content: string;
  style?: 'normal' | 'fragmented' | 'whisper' | 'shout';
  drift?: boolean;
  position?: { x: number; y: number };
  delay?: number;
}

// Map our style types to typography-toolkit animations
const STYLE_TO_ANIMATIONS: Record<
  string,
  Array<'falling' | 'splitting' | 'glitching' | 'floating'>
> = {
  normal: ['floating'],
  fragmented: ['splitting', 'glitching'],
  whisper: ['floating'],
  shout: ['falling', 'glitching'],
};

// Style-specific visual settings
const STYLE_CONFIG: Record<
  string,
  { fontSize: number; opacity: number; speed: number; amplitude: number }
> = {
  normal: { fontSize: 18, opacity: 0.9, speed: 1, amplitude: 1 },
  fragmented: { fontSize: 16, opacity: 0.7, speed: 1.5, amplitude: 2 },
  whisper: { fontSize: 14, opacity: 0.5, speed: 0.5, amplitude: 0.5 },
  shout: { fontSize: 28, opacity: 1, speed: 2, amplitude: 3 },
};

export function FloatingText({
  content,
  style = 'normal',
  drift = true,
  position,
  delay = 0,
}: FloatingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animatedTextRef = useRef<AnimatedText | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const createText = () => {
      const config = STYLE_CONFIG[style];
      const animations = STYLE_TO_ANIMATIONS[style];

      // Calculate position
      const x = position ? (container.clientWidth * position.x) / 100 : undefined;
      const y = position ? (container.clientHeight * position.y) / 100 : undefined;

      animatedTextRef.current = new AnimatedText({
        text: content,
        container,
        animations,
        cycle: true,
        speed: drift ? config.speed : 0,
        amplitude: config.amplitude,
        position: x !== undefined && y !== undefined ? { x, y } : undefined,
        style: {
          fontSize: config.fontSize,
          color: `rgba(77, 208, 225, ${config.opacity})`,
          fontFamily: "'Inter', sans-serif",
          textShadow:
            style === 'shout'
              ? '0 0 30px rgba(255, 107, 107, 0.6), 0 0 60px rgba(255, 107, 107, 0.3)'
              : style === 'whisper'
                ? '0 0 10px rgba(77, 208, 225, 0.3)'
                : '0 0 20px rgba(77, 208, 225, 0.5)',
        },
        containerClass: `floating-text floating-text--${style} ${drift ? 'drift' : ''}`,
      });
    };

    if (delay > 0) {
      const timer = setTimeout(createText, delay);
      return () => {
        clearTimeout(timer);
        if (animatedTextRef.current) {
          animatedTextRef.current.destroy();
          animatedTextRef.current = null;
        }
      };
    } else {
      createText();
      return () => {
        if (animatedTextRef.current) {
          animatedTextRef.current.destroy();
          animatedTextRef.current = null;
        }
      };
    }
  }, [content, style, drift, position, delay]);

  return <div ref={containerRef} className="floating-text-container" />;
}

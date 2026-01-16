import { useEffect, useRef, useCallback } from 'react';
import { AnimatedText } from 'typography-toolkit';
import type { ThoughtFragment } from '../shared/Character';
import './ThinkingStream.css';

interface ThinkingStreamProps {
  thoughts: ThoughtFragment[];
  isActive: boolean;
  onComplete?: () => void;
}

interface ActiveThought {
  id: string;
  instance: AnimatedText;
  createdAt: number;
  decay: 'fast' | 'slow' | 'linger';
}

export function ThinkingStream({ thoughts, isActive, onComplete }: ThinkingStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thoughtIndexRef = useRef(0);
  const activeThoughtsRef = useRef<ActiveThought[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Cleanup function for thoughts
  const cleanupThoughts = useCallback(() => {
    const now = Date.now();
    activeThoughtsRef.current = activeThoughtsRef.current.filter((t) => {
      const age = now - t.createdAt;
      const maxAge = t.decay === 'fast' ? 1500 : t.decay === 'slow' ? 4000 : 6000;
      if (age >= maxAge) {
        t.instance.destroy();
        return false;
      }
      return true;
    });
  }, []);

  // Stream thoughts one by one
  useEffect(() => {
    if (!isActive || thoughts.length === 0) {
      thoughtIndexRef.current = 0;
      // Cleanup all active thoughts when deactivated
      activeThoughtsRef.current.forEach((t) => t.instance.destroy());
      activeThoughtsRef.current = [];
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const streamNext = () => {
      if (thoughtIndexRef.current >= thoughts.length) {
        // All thoughts shown, trigger complete after last one fades
        setTimeout(() => {
          onComplete?.();
        }, 2000);
        return;
      }

      const thought = thoughts[thoughtIndexRef.current];
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      // Random position, weighted toward center
      const x = width * 0.2 + Math.random() * width * 0.6;
      const y = height * 0.2 + Math.random() * height * 0.6;

      // Determine animation type based on thought properties
      const animations: Array<'falling' | 'splitting' | 'glitching' | 'floating'> = thought.glitch
        ? ['glitching']
        : thought.intensity > 0.7
          ? ['falling', 'glitching']
          : ['floating', 'splitting'];

      // Calculate opacity and font size based on intensity
      const opacity = 0.4 + thought.intensity * 0.6;
      const fontSize = 14 + thought.intensity * 20;

      // Create AnimatedText instance using typography-toolkit
      const fadeOutTime =
        thought.decay === 'fast' ? 1500 : thought.decay === 'slow' ? 4000 : 6000;

      const animatedText = new AnimatedText({
        text: thought.text,
        container,
        animations,
        cycle: true,
        speed: thought.intensity * 1.5,
        amplitude: thought.glitch ? 2 : 1,
        position: { x, y },
        fadeOut: fadeOutTime,
        style: {
          fontSize,
          color: `rgba(77, 208, 225, ${opacity})`,
          fontFamily: "'Inter', sans-serif",
          textShadow: `0 0 ${10 + thought.intensity * 20}px rgba(77, 208, 225, ${opacity * 0.5})`,
        },
        containerClass: `thought-fragment ${thought.glitch ? 'glitch' : ''} decay-${thought.decay}`,
      });

      // Track the active thought
      activeThoughtsRef.current.push({
        id: `thought-${Date.now()}-${thoughtIndexRef.current}`,
        instance: animatedText,
        createdAt: Date.now(),
        decay: thought.decay,
      });

      thoughtIndexRef.current++;

      // Schedule next thought
      const delay = thought.decay === 'fast' ? 400 : thought.decay === 'slow' ? 1200 : 2000;
      setTimeout(streamNext, delay);
    };

    // Start streaming
    const startDelay = setTimeout(streamNext, 300);

    // Setup cleanup interval
    const cleanupInterval = setInterval(cleanupThoughts, 500);

    return () => {
      clearTimeout(startDelay);
      clearInterval(cleanupInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, thoughts, onComplete, cleanupThoughts]);

  // Clear all when not active
  useEffect(() => {
    if (!isActive) {
      activeThoughtsRef.current.forEach((t) => t.instance.destroy());
      activeThoughtsRef.current = [];
    }
  }, [isActive]);

  return <div ref={containerRef} className="thinking-stream" />;
}

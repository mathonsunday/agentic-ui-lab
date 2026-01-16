import { useEffect, useRef } from 'react';
import {
  // Motion
  timing,
  pulse,
  bob,
  waver,
  // Drawing
  drawBiolumGlow,
  drawJellyfish,
  drawTentacle,
  // Eyes
  createEye,
  updateEye,
  drawEye,
  type Eye,
} from 'visual-toolkit';
import './CreaturePresence.css';

interface CreaturePresenceProps {
  type: 'seeker' | 'tendril' | 'leviathan-eye' | 'jellyfish';
  visible?: boolean;
  felt?: boolean; // presence is felt but not seen
  position?: { x: number; y: number };
  direction?: 'above' | 'below' | 'left' | 'right';
}

export function CreaturePresence({
  type,
  visible = true,
  felt = false,
  position = { x: 50, y: 50 },
  direction = 'below',
}: CreaturePresenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const eyeRef = useRef<Eye | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 200;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Initialize eye for leviathan-eye type
    if (type === 'leviathan-eye' && !eyeRef.current) {
      eyeRef.current = createEye({
        x: centerX,
        y: centerY,
        size: 50,
        hue: 0, // red
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      timeRef.current += 16; // ~60fps in ms

      const opacity = visible ? 1 : felt ? 0.15 : 0;

      if (type === 'seeker') {
        // Use visual-toolkit's bioluminescent glow
        const pulseIntensity = pulse(timeRef.current, timing.medium, 0.6, 1.0);
        const hue = 190; // cyan

        // Outer glow
        drawBiolumGlow(
          ctx,
          centerX,
          centerY,
          12 * pulseIntensity,
          hue,
          opacity * pulseIntensity,
          timeRef.current
        );

        // Add secondary smaller glows for depth
        const offset1 = bob(timeRef.current, timing.slow, 8);
        drawBiolumGlow(
          ctx,
          centerX + 15,
          centerY + offset1,
          5,
          hue + 10,
          opacity * 0.4,
          timeRef.current
        );

        const offset2 = bob(timeRef.current + 1000, timing.slow, 6);
        drawBiolumGlow(
          ctx,
          centerX - 12,
          centerY + offset2 - 5,
          4,
          hue - 5,
          opacity * 0.3,
          timeRef.current
        );
      }

      if (type === 'leviathan-eye' && eyeRef.current) {
        // Use visual-toolkit's eye system
        ctx.globalAlpha = opacity;

        // Update eye (slowly track center, occasional blink)
        updateEye(eyeRef.current, centerX, centerY);

        // Draw the eye
        drawEye(ctx, eyeRef.current);

        ctx.globalAlpha = 1;

        // Add ominous outer glow
        const glowGrad = ctx.createRadialGradient(
          centerX, centerY, 30,
          centerX, centerY, 80
        );
        glowGrad.addColorStop(0, `rgba(200, 50, 50, ${opacity * 0.2})`);
        glowGrad.addColorStop(0.5, `rgba(150, 30, 30, ${opacity * 0.1})`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
        ctx.fill();
      }

      if (type === 'tendril') {
        // Build tendril segments using visual-toolkit's waver function
        const startX = direction === 'left' ? 0 : direction === 'right' ? canvas.width : centerX;
        const startY = direction === 'above' ? 0 : direction === 'below' ? canvas.height : centerY;

        ctx.globalAlpha = opacity * 0.7;

        // Generate segments with organic waver motion
        const segmentCount = 12;
        const segments: Array<{ x: number; y: number }> = [];

        for (let i = 0; i <= segmentCount; i++) {
          const t = i / segmentCount;
          const waverOffset = waver(timeRef.current, i, timing.slow);

          segments.push({
            x: startX + (centerX - startX) * t + waverOffset.x * 15,
            y: startY + (centerY - startY) * t + waverOffset.y * 10,
          });
        }

        // Draw main tendril with gradient thickness
        drawTentacle(ctx, segments, 4, 'rgba(77, 208, 225, 0.6)');

        // Secondary thinner tendril
        const segments2: Array<{ x: number; y: number }> = [];
        const offset = direction === 'left' ? 10 : direction === 'right' ? -10 : 5;

        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const waverOffset = waver(timeRef.current + 500, i, timing.slow);

          segments2.push({
            x: startX + offset + (centerX + 10 - startX - offset) * t + waverOffset.x * 10,
            y: startY + (centerY - 10 - startY) * t + waverOffset.y * 8,
          });
        }

        drawTentacle(ctx, segments2, 2, 'rgba(77, 208, 225, 0.3)');

        ctx.globalAlpha = 1;
      }

      if (type === 'jellyfish') {
        // Use visual-toolkit's jellyfish recipe
        ctx.globalAlpha = opacity;

        drawJellyfish(ctx, centerX, centerY, {
          bellWidth: 50,
          tentacleCount: 5,
          time: timeRef.current,
          glowIntensity: 0.5,
        });

        ctx.globalAlpha = 1;
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [type, visible, felt, direction]);

  return (
    <canvas
      ref={canvasRef}
      className={`creature-presence creature-presence--${type} ${felt && !visible ? 'felt' : ''}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
    />
  );
}

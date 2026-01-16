import { useEffect, useRef } from 'react';
import {
  // Particles
  createMarineSnow,
  updateMarineSnow,
  drawMarineSnow,
  createBioParticles,
  drawBioParticles,
  // Gradients
  deepWaterBackground,
  // Motion
  timing,
  type Particle,
  type BioParticle,
} from 'visual-toolkit';
import './Atmosphere.css';

interface AtmosphereProps {
  mood: 'wonder' | 'obsession' | 'calm' | 'distress';
  depth?: number; // 0-5000 meters
  intensity?: number; // 0-1
}

// Mood-specific adjustments layered on top of the deep-sea base
const MOOD_OVERLAYS: Record<string, { color: string; vignette: number }> = {
  wonder: { color: 'rgba(77, 208, 225, 0.03)', vignette: 0.3 },
  obsession: { color: 'rgba(255, 107, 107, 0.04)', vignette: 0.5 },
  calm: { color: 'rgba(77, 208, 225, 0.02)', vignette: 0.2 },
  distress: { color: 'rgba(255, 107, 107, 0.06)', vignette: 0.6 },
};

export function Atmosphere({ mood, depth = 2000, intensity = 0.8 }: AtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const marineSnowRef = useRef<Particle[]>([]);
  const bioParticlesRef = useRef<BioParticle[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles using visual-toolkit
    const snowCount = Math.floor(60 + depth / 80);
    marineSnowRef.current = createMarineSnow(snowCount);

    // Add bioluminescent particles - more for wonder/calm moods
    const bioCount = mood === 'wonder' || mood === 'calm' ? 12 : mood === 'obsession' ? 8 : 4;
    bioParticlesRef.current = createBioParticles(bioCount);

    const moodOverlay = MOOD_OVERLAYS[mood];

    const render = () => {
      timeRef.current += 16; // ~60fps

      // Deep water background from visual-toolkit
      ctx.fillStyle = deepWaterBackground(ctx, canvas.height);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Depth-based darkening (deeper = darker)
      const depthDarkness = Math.min(depth / 5000, 0.6);
      ctx.fillStyle = `rgba(0, 0, 0, ${depthDarkness})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Mood-specific color overlay
      ctx.fillStyle = moodOverlay.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw marine snow (visual-toolkit)
      updateMarineSnow(marineSnowRef.current, 'down');
      drawMarineSnow(ctx, marineSnowRef.current, canvas.width, canvas.height);

      // Draw bioluminescent particles (visual-toolkit) - premium glow effect
      drawBioParticles(
        ctx,
        bioParticlesRef.current,
        canvas.width,
        canvas.height,
        timeRef.current
      );

      // Update bio particle positions slowly
      for (const p of bioParticlesRef.current) {
        p.y += p.speed;
        p.x += Math.sin(timeRef.current * timing.glacial + (p.phase ?? 0)) * 0.0003;

        if (p.y > 1.05) {
          p.y = -0.05;
          p.x = Math.random();
        }
      }

      // Vignette effect (darker at edges)
      const vignetteGrad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.3,
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.8
      );
      vignetteGrad.addColorStop(0, 'transparent');
      vignetteGrad.addColorStop(1, `rgba(0, 0, 0, ${moodOverlay.vignette * intensity})`);
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distress glitch effect
      if (mood === 'distress' && Math.random() > 0.96) {
        const glitchY = Math.random() * canvas.height;
        const glitchH = 3 + Math.random() * 15;
        try {
          const imageData = ctx.getImageData(0, glitchY, canvas.width, glitchH);
          ctx.putImageData(imageData, Math.random() * 15 - 7, glitchY);
        } catch {
          // Ignore cross-origin or other getImageData errors
        }
      }

      // Obsession: occasional red pulse at edges
      if (mood === 'obsession' && Math.random() > 0.98) {
        ctx.fillStyle = `rgba(255, 60, 60, ${0.02 + Math.random() * 0.03})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mood, depth, intensity]);

  return <canvas ref={canvasRef} className={`atmosphere atmosphere--${mood}`} />;
}

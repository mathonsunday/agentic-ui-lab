import { useEffect, useRef } from 'react';

interface SceneViewerProps {
  sceneId: string;
}

// Map scene IDs to video sources
const SCENE_VIDEOS: Record<string, string> = {
  shadows: '/videos/128421-741495470.mp4',
  'giant-squid': '/videos/128421-741495470.mp4',
  'rov-exterior': '/videos/128421-741495470.mp4',
  leviathan: '/videos/128421-741495470.mp4',
  wall: '/videos/128421-741495470.mp4',
};

export function SceneViewer({ sceneId }: SceneViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSource = SCENE_VIDEOS[sceneId];

  useEffect(() => {
    // If we have a video source for this scene, use video
    if (videoSource && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Video play failed, fallback will be shown
      });
      return;
    }

    // Otherwise use canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Try to get scenes from visual-toolkit if available
    const renderScene = async () => {
      try {
        // Dynamic import to avoid issues if visual-toolkit scenes aren't loaded
        const { scenes } = await import('visual-toolkit');

        if (!scenes) {
          renderPlaceholder(canvas, sceneId, 'Scenes module not loaded');
          return;
        }

        // Map sceneId to scene class
        const sceneMap: Record<string, any> = {
          shadows: scenes.deepSea?.shadows,
          'giant-squid': scenes.deepSea?.giantSquid,
          'rov-exterior': scenes.deepSea?.rovExterior,
          leviathan: scenes.deepSea?.leviathan,
          wall: scenes.deepSea?.wall,
        };

        const SceneClass = sceneMap[sceneId];

        if (SceneClass && SceneClass.init) {
          try {
            await SceneClass.init(canvas, { intensity: 0.8, duration: Infinity });
          } catch (err) {
            renderPlaceholder(canvas, sceneId, 'Scene render failed');
          }
        } else {
          renderPlaceholder(canvas, sceneId, 'Scene not found');
        }
      } catch (err) {
        renderPlaceholder(canvas, sceneId, 'Unable to load scenes');
      }
    };

    renderScene();

    // Handle resize
    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sceneId]);

  return (
    <>
      {videoSource ? (
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            background: '#010508',
          }}
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={videoSource} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            background: '#010508',
          }}
        />
      )}
    </>
  );
}

function renderPlaceholder(canvas: HTMLCanvasElement, sceneId: string, message: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#010508';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#4dd0e1';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(sceneId.toUpperCase(), canvas.width / 2, canvas.height / 2 - 40);

  ctx.fillStyle = '#888';
  ctx.font = '14px monospace';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 20);
}

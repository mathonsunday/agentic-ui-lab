import type { ReactNode } from 'react';
import './VisualCanvas.css';

interface VisualCanvasProps {
  children: ReactNode;
}

export function VisualCanvas({ children }: VisualCanvasProps) {
  return <div className="visual-canvas">{children}</div>;
}

import { useRef, useEffect } from 'react';

interface AsciiCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function AsciiCanvas({ canvasRef }: AsciiCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [canvasRef]);

  return (
    <div ref={containerRef} className="ascii-canvas-container">
      <canvas ref={canvasRef} />
    </div>
  );
}

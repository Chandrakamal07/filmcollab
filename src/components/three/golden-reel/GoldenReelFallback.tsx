import * as React from "react";
import { cn } from "@/lib/utils";
import { renderReferenceFallback } from "./render-reference-fallback";

export interface GoldenReelFallbackProps { className?: string }
export const GoldenReelFallback: React.FC<GoldenReelFallbackProps> = ({ className }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    let frame = 0;
    const render = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => renderReferenceFallback(canvas, canvas.clientWidth, canvas.clientHeight));
    };
    const observer = new ResizeObserver(render); observer.observe(canvas); render();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  return <div data-testid="golden-reel-fallback" className={cn("relative w-full h-full overflow-hidden pointer-events-none select-none", className)}>
    <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />
  </div>;
};

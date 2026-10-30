import * as React from "react";
import { Play, Pause, RotateCcw, MoveHorizontal, Sliders, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { CinemaEngineScene, CinemaEngineSceneHandle } from "./CinemaEngineScene";
import { CinemaEngineFallback } from "./CinemaEngineFallback";
import { CameraPartConfig, DEFAULT_ASSEMBLY_VALUE } from "./assembly-config";

export interface CinemaEngineHeroProps {
  className?: string;
}

export const CinemaEngineHero: React.FC<CinemaEngineHeroProps> = ({ className }) => {
  const [isReady, setIsReady] = React.useState(false);
  const [assemblyValue, setAssemblyValue] = React.useState(DEFAULT_ASSEMBLY_VALUE);
  const [isPaused, setIsPaused] = React.useState(false);
  const [hoveredComponent, setHoveredComponent] = React.useState<CameraPartConfig | null>(null);

  const sceneRef = React.useRef<CinemaEngineSceneHandle | null>(null);

  const handleReset = () => {
    sceneRef.current?.resetView();
    setAssemblyValue(DEFAULT_ASSEMBLY_VALUE);
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAssemblyValue(val);
  };

  return (
    <div
      data-testid="cinema-engine-hero-container"
      data-webgl-ready={isReady ? "true" : "initializing"}
      className={cn(
        "relative w-full h-full min-h-[340px] sm:min-h-[420px] overflow-hidden select-none",
        className,
      )}
    >
      {/* 3D WebGL Scene Mount */}
      <div
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity duration-500 ease-out z-10",
          isReady ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <CinemaEngineScene
          ref={sceneRef}
          assemblyValue={assemblyValue}
          onAssemblyChange={setAssemblyValue}
          isPaused={isPaused}
          onHoverComponent={setHoveredComponent}
          onReady={() => setIsReady(true)}
        />
      </div>

      {/* Cinematic CSS 3D Fallback */}
      <div
        className={cn(
          "absolute inset-0 z-0 transition-opacity duration-500 ease-out",
          isReady ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      >
        <CinemaEngineFallback />
      </div>

      {/* Component Inspector HUD Badge (Active on hover or keyboard select) */}
      <div
        data-testid="cinema-engine-component-inspector"
        className={cn(
          "absolute top-3 left-3 sm:left-4 z-30 max-w-[280px] sm:max-w-xs transition-all duration-300 pointer-events-none",
          hoveredComponent ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        )}
      >
        {hoveredComponent && (
          <div className="rounded-xl border border-primary/40 bg-[#0F1116]/90 backdrop-blur-md p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono tracking-wider text-primary uppercase font-semibold">
              <Info className="w-3 h-3 text-primary" />
              <span>{hoveredComponent.category} // {hoveredComponent.label}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {hoveredComponent.description}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Camera HUD Controls Bar */}
      <div className="absolute bottom-3 right-3 sm:right-4 z-30 flex flex-wrap items-center justify-end gap-2 max-w-full">
        {/* Drag to Assemble Indicator */}
        <div
          className={cn(
            "pointer-events-none inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#101216]/85 backdrop-blur-md text-[11px] font-mono text-muted-foreground transition-opacity duration-300 shadow-noir-sm",
            isReady && !isPaused ? "opacity-90" : "opacity-0",
          )}
        >
          <MoveHorizontal className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="hidden sm:inline">Drag to assemble</span>
        </div>

        {/* Compact Assembly Slider Control */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-[#101216]/85 backdrop-blur-md text-[11px] font-mono text-muted-foreground shadow-noir-sm">
          <Sliders className="w-3 h-3 text-primary shrink-0" />
          <span className="hidden md:inline text-[10px] uppercase tracking-wider text-muted-foreground/80">
            Assembly
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={assemblyValue}
            onChange={handleSliderChange}
            aria-label="Cinema Engine Assembly Separation Slider"
            className="w-16 sm:w-20 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-[10px] w-7 text-right font-mono text-foreground/90">
            {Math.round(assemblyValue * 100)}%
          </span>
        </div>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={handleReset}
          aria-label="Reset Cinema Engine Assembly View"
          title="Reset to default assembly view"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#101216]/85 backdrop-blur-md text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-[#16181E]/90 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-noir-sm group cursor-pointer"
        >
          <RotateCcw className="w-3 h-3 text-primary transition-transform group-hover:-rotate-45" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Accessible Pause / Resume Button */}
        <button
          type="button"
          onClick={handleTogglePause}
          aria-label={isPaused ? "Resume Cinema Engine motion" : "Pause Cinema Engine motion"}
          aria-pressed={isPaused}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#101216]/85 backdrop-blur-md text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-[#16181E]/90 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-noir-sm group cursor-pointer"
        >
          {isPaused ? (
            <>
              <Play className="w-3 h-3 text-primary transition-transform group-hover:scale-110" />
              <span>Resume</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 text-primary transition-transform group-hover:scale-110" />
              <span>Pause</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CinemaEngineHero;


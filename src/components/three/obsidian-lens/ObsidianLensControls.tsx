import * as React from "react";
import {
  RotateCcw,
  Play,
  Pause,
  Aperture,
  Sliders,
  Info,
  Focus,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ObsidianComponent, T_STOPS } from "./ObsidianLensModel";

export interface ObsidianLensControlsProps {
  isReady: boolean;
  isPaused: boolean;
  aperture: number;
  focus: number;
  hoveredComponent: ObsidianComponent | null;
  onApertureChange: (value: number) => void;
  onReset: () => void;
  onTogglePause: () => void;
}

export const ObsidianLensControls: React.FC<ObsidianLensControlsProps> = ({
  isReady,
  isPaused,
  aperture,
  focus,
  hoveredComponent,
  onApertureChange,
  onReset,
  onTogglePause,
}) => {
  // Find closest T-stop descriptor for HUD readout
  const currentTStop = React.useMemo(() => {
    let closest = T_STOPS[0];
    let minDiff = 999;
    for (const stop of T_STOPS) {
      const diff = Math.abs(stop.value - aperture);
      if (diff < minDiff) {
        minDiff = diff;
        closest = stop;
      }
    }
    return closest;
  }, [aperture]);

  // Focus distance calculation for readout (0 = Infinity, 1 = 0.5m)
  const focusDistanceText = React.useMemo(() => {
    if (focus < 0.08) return "∞ (Infinity)";
    if (focus < 0.22) return "10.0m (33ft)";
    if (focus < 0.40) return "3.0m (10ft)";
    if (focus < 0.60) return "1.5m (5ft)";
    if (focus < 0.80) return "0.9m (3ft)";
    return "0.5m (1.7ft Close Focus)";
  }, [focus]);

  return (
    <>
      {/* Top-Left: Component Inspection HUD Badge (Active on hover/tap) */}
      <div
        data-testid="obsidian-component-inspector"
        className={cn(
          "absolute top-3 left-3 sm:left-4 z-30 max-w-[280px] sm:max-w-xs transition-all duration-300 pointer-events-none",
          hoveredComponent ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}
      >
        {hoveredComponent && (
          <div className="rounded-xl border border-primary/45 bg-[#090A0E]/92 backdrop-blur-md p-3 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono tracking-wider text-primary uppercase font-semibold">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>{hoveredComponent.category}</span>
            </div>
            <div className="text-xs font-semibold text-foreground/95 mb-0.5">
              {hoveredComponent.name}
            </div>
            <p className="text-[11px] text-[#A6ABB4] leading-snug">
              {hoveredComponent.description}
            </p>
          </div>
        )}
      </div>

      {/* Top-Right: Focus Ring Drag Status Badge */}
      <div
        data-testid="obsidian-focus-badge"
        className="absolute top-3 right-3 sm:right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-[#0A0C10]/85 backdrop-blur-md shadow-noir-sm text-[11px] font-mono"
      >
        <Focus className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-muted-foreground/80 hidden sm:inline">Focus:</span>
        <span className="text-foreground/95 font-medium">{focusDistanceText}</span>
        <span className="text-white/20 hidden sm:inline">•</span>
        <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">Drag to shift</span>
      </div>

      {/* Bottom Bar: Aperture Slider + Readout + Reset + Pause/Resume */}
      <div className="absolute bottom-3 right-3 sm:right-4 left-3 sm:left-auto z-30 flex flex-wrap items-center justify-between sm:justify-end gap-2.5 pointer-events-auto">
        {/* Aperture Iris Control Slider */}
        <div
          data-testid="obsidian-aperture-control"
          className={cn(
            "flex items-center gap-3 px-3.5 py-1.5 rounded-xl border border-white/10 bg-[#0A0C10]/90 backdrop-blur-md shadow-noir-sm transition-opacity duration-300",
            isReady ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <Aperture className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-bold text-primary tracking-wider">{currentTStop.label}</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={aperture}
              onChange={(e) => onApertureChange(parseFloat(e.target.value))}
              aria-label={`Calibrated Iris Aperture (Current: ${currentTStop.label})`}
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={aperture}
              aria-valuetext={`${currentTStop.label} - ${currentTStop.desc}`}
              className="w-20 sm:w-28 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          <span className="hidden md:inline text-[10px] font-mono text-muted-foreground/70 max-w-[150px] truncate">
            {currentTStop.desc}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Reset Button */}
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset Obsidian Lens to default configuration"
            title="Reset aperture, focus, and camera"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#0A0C10]/85 backdrop-blur-md text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-[#12151C]/90 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-noir-sm group cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-primary transition-transform group-hover:-rotate-45" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={onTogglePause}
            aria-label={isPaused ? "Resume Obsidian Lens ambient motion" : "Pause Obsidian Lens ambient motion"}
            aria-pressed={isPaused}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#0A0C10]/85 backdrop-blur-md text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-[#12151C]/90 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-noir-sm group cursor-pointer"
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
    </>
  );
};


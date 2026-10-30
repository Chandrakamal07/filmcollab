import * as React from "react";
import {
  RotateCcw,
  Play,
  Pause,
  MoveHorizontal,
  Compass,
  Sparkles,
  Info,
  Sun,
  Eye,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LightingPresetId,
  LIGHTING_PRESETS,
  SoundstageComponent,
  MAX_ARC_ANGLE_RAD,
} from "./lighting-presets";

export interface SoundstageControlsProps {
  isReady: boolean;
  isPaused: boolean;
  viewpointAngle: number; // in radians, -MAX_ARC_ANGLE_RAD to +MAX_ARC_ANGLE_RAD
  currentPreset: LightingPresetId;
  hoveredComponent: SoundstageComponent | null;
  onAngleChange: (angle: number) => void;
  onSelectPreset: (presetId: LightingPresetId) => void;
  onResetView: () => void;
  onTogglePause: () => void;
}

export const SoundstageControls: React.FC<SoundstageControlsProps> = ({
  isReady,
  isPaused,
  viewpointAngle,
  currentPreset,
  hoveredComponent,
  onAngleChange,
  onSelectPreset,
  onResetView,
  onTogglePause,
}) => {
  // Convert radians to degrees for human-readable display (-18 to +18)
  const degrees = Math.round((viewpointAngle * 180) / Math.PI);
  const normalizedSliderValue = (viewpointAngle + MAX_ARC_ANGLE_RAD) / (2 * MAX_ARC_ANGLE_RAD);

  const handleSliderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fraction = parseFloat(e.target.value);
    const newRad = (fraction * 2 - 1) * MAX_ARC_ANGLE_RAD;
    onAngleChange(newRad);
  };

  return (
    <>
      {/* Top-Left: Component Inspection Badge (Active on hover/tap) */}
      <div
        data-testid="soundstage-component-inspector"
        className={cn(
          "absolute top-3 left-3 sm:left-4 z-30 max-w-[280px] sm:max-w-xs transition-all duration-300 pointer-events-none",
          hoveredComponent ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}
      >
        {hoveredComponent && (
          <div className="rounded-xl border border-primary/45 bg-[#090A0E]/90 backdrop-blur-md p-3 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
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

      {/* Top-Right: Lighting Presets HUD Selector */}
      <div
        data-testid="soundstage-lighting-presets"
        className="absolute top-3 right-3 sm:right-4 z-30 flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-[#0A0C10]/85 backdrop-blur-md shadow-noir-sm"
      >
        <span className="hidden sm:flex items-center gap-1 pl-2 pr-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">
          <Sun className="w-3 h-3 text-primary" />
          <span>Light</span>
        </span>

        {(Object.keys(LIGHTING_PRESETS) as LightingPresetId[]).map((presetId) => {
          const preset = LIGHTING_PRESETS[presetId];
          const isActive = currentPreset === presetId;
          return (
            <button
              key={presetId}
              type="button"
              onClick={() => onSelectPreset(presetId)}
              aria-label={`Select ${preset.label} Lighting Preset`}
              aria-pressed={isActive}
              title={preset.description}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                isActive
                  ? "bg-primary/20 text-primary border border-primary/40 font-semibold shadow-[0_0_12px_rgba(233,180,87,0.25)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-transparent"
              )}
            >
              <span
                className="w-2 h-2 rounded-full border border-black/50"
                style={{ backgroundColor: preset.keyColor }}
              />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Bar: Drag Indicator + Viewpoint Angle Slider + Reset + Pause */}
      <div className="absolute bottom-3 right-3 sm:right-4 z-30 flex flex-wrap items-center justify-end gap-2 max-w-full">
        {/* Drag to Explore Indicator */}
        <div
          data-testid="soundstage-drag-indicator"
          className={cn(
            "pointer-events-none inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#0A0C10]/85 backdrop-blur-md text-[11px] font-mono text-muted-foreground transition-opacity duration-300 shadow-noir-sm",
            isReady ? "opacity-90" : "opacity-0"
          )}
        >
          <MoveHorizontal className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="hidden sm:inline">Drag to explore</span>
        </div>

        {/* Viewpoint Arc Slider */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-[#0A0C10]/85 backdrop-blur-md text-[11px] font-mono text-muted-foreground shadow-noir-sm">
          <Compass className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="hidden md:inline text-[10px] uppercase tracking-wider text-muted-foreground/80">
            Angle
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={normalizedSliderValue}
            onChange={handleSliderInput}
            aria-label="Soundstage Viewpoint Angle Slider"
            className="w-16 sm:w-20 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-[10px] w-7 text-right font-mono text-foreground/90">
            {degrees > 0 ? `+${degrees}°` : `${degrees}°`}
          </span>
        </div>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={onResetView}
          aria-label="Reset Soundstage Camera View"
          title="Reset to default soundstage viewpoint"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#0A0C10]/85 backdrop-blur-md text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-[#12151C]/90 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-noir-sm group cursor-pointer"
        >
          <RotateCcw className="w-3 h-3 text-primary transition-transform group-hover:-rotate-45" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Pause / Resume Ambient Motion */}
        <button
          type="button"
          onClick={onTogglePause}
          aria-label={isPaused ? "Resume Soundstage ambient motion" : "Pause Soundstage ambient motion"}
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
    </>
  );
};


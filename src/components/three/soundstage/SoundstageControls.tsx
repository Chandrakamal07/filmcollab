import * as React from "react";
import {
  RotateCcw,
  Play,
  Pause,
  Compass,
  Info,
  Sun,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATION_LIGHTING_LOOKS,
  SoundstageComponent,
} from "./lighting-presets";

export interface SoundstageControlsProps {
  isReady: boolean;
  isPaused: boolean;
  activeStationIndex: number;
  sequencePhase: "travel" | "dwell";
  stationLabel: string;
  hoveredComponent: SoundstageComponent | null;
  onSelectStation: (index: number) => void;
  onResetSequence: () => void;
  onTogglePause: () => void;
}

export const SoundstageControls: React.FC<SoundstageControlsProps> = ({
  isReady,
  isPaused,
  activeStationIndex,
  sequencePhase,
  stationLabel,
  hoveredComponent,
  onSelectStation,
  onResetSequence,
  onTogglePause,
}) => {
  const currentLook = STATION_LIGHTING_LOOKS[activeStationIndex] || STATION_LIGHTING_LOOKS[0];

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

      {/* Top-Right: 5-Station Track Waypoints HUD Selector */}
      <div
        data-testid="soundstage-track-stations"
        className="absolute top-3 right-3 sm:right-4 z-30 flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-[#0A0C10]/85 backdrop-blur-md shadow-noir-sm max-w-full overflow-x-auto"
      >
        <span className="hidden sm:flex items-center gap-1 pl-2 pr-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">
          <Camera className="w-3 h-3 text-primary" />
          <span>Track</span>
        </span>

        {STATION_LIGHTING_LOOKS.map((look, idx) => {
          const isActive = activeStationIndex === idx;
          return (
            <button
              key={look.id}
              type="button"
              onClick={() => onSelectStation(idx)}
              aria-label={`Move camera to station ${look.label} (${look.title})`}
              aria-pressed={isActive}
              title={`${look.label}: ${look.title} - ${look.description}`}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shrink-0",
                isActive
                  ? "bg-primary/20 text-primary border border-primary/40 font-semibold shadow-[0_0_12px_rgba(233,180,87,0.25)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-transparent"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full border border-black/50 transition-transform",
                  isActive ? "scale-125" : "opacity-60"
                )}
                style={{ backgroundColor: look.keyColor }}
              />
              <span>{look.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Bar: Station Live Status + Reset + Pause / Resume */}
      <div className="absolute bottom-3 right-3 sm:right-4 left-3 sm:left-auto z-30 flex flex-wrap items-center justify-between sm:justify-end gap-2 pointer-events-auto">
        {/* Track Sequence Status Indicator */}
        <div
          data-testid="soundstage-sequence-status"
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-[#0A0C10]/85 backdrop-blur-md text-[11px] font-mono transition-opacity duration-300 shadow-noir-sm",
            isReady ? "opacity-95" : "opacity-0"
          )}
        >
          <Compass className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
              {currentLook.label}
            </span>
            <span className="text-white/30">•</span>
            <span className="text-[11px] text-foreground/90 truncate">
              {sequencePhase === "travel" ? "Dolly Traveling..." : (stationLabel || currentLook.title)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Restart Sequence Button */}
          <button
            type="button"
            onClick={onResetSequence}
            aria-label="Restart camera track sequence from start"
            title="Restart track sequence from -60°"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#0A0C10]/85 backdrop-blur-md text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-[#12151C]/90 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-noir-sm group cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-primary transition-transform group-hover:-rotate-45" />
            <span className="hidden sm:inline">Restart</span>
          </button>

          {/* Pause / Resume Sequence Button */}
          <button
            type="button"
            onClick={onTogglePause}
            aria-label={isPaused ? "Resume camera track sequence" : "Pause camera track sequence"}
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

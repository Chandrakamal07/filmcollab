import * as React from "react";
import { cn } from "@/lib/utils";
import { SoundstageScene, SoundstageSceneHandle } from "./SoundstageScene";
import { SoundstageFallback } from "./SoundstageFallback";
import { SoundstageControls } from "./SoundstageControls";
import {
  SoundstageComponent,
  STATION_LIGHTING_LOOKS,
} from "./lighting-presets";

export interface SoundstageHeroProps {
  className?: string;
}

export const SoundstageHero: React.FC<SoundstageHeroProps> = ({ className }) => {
  const [isReady, setIsReady] = React.useState(false);
  const [activeStationIndex, setActiveStationIndex] = React.useState(0);
  const [sequencePhase, setSequencePhase] = React.useState<"travel" | "dwell">("dwell");
  const [stationLabel, setStationLabel] = React.useState(STATION_LIGHTING_LOOKS[0].title);
  const [userPaused, setUserPaused] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [hoveredComponent, setHoveredComponent] = React.useState<SoundstageComponent | null>(null);

  const sceneRef = React.useRef<SoundstageSceneHandle | null>(null);

  // Monitor prefers-reduced-motion media query independently from user pause state
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Stable callbacks
  const handleStationChange = React.useCallback(
    (stationIndex: number, phase: "travel" | "dwell", label: string) => {
      setActiveStationIndex(stationIndex);
      setSequencePhase(phase);
      setStationLabel(label);
    },
    []
  );

  const handleReady = React.useCallback(() => {
    setIsReady(true);
  }, []);

  const handleHover = React.useCallback((component: SoundstageComponent | null) => {
    setHoveredComponent(component);
  }, []);

  const handleSelectStation = React.useCallback((index: number) => {
    sceneRef.current?.goToStation(index);
    setActiveStationIndex(index);
  }, []);

  const handleResetSequence = React.useCallback(() => {
    sceneRef.current?.resetSequence();
    setActiveStationIndex(0);
  }, []);

  const handleTogglePause = React.useCallback(() => {
    setUserPaused((prev) => !prev);
  }, []);

  return (
    <div
      role="region"
      aria-label="FilmCollab Infinite Soundstage Cinematic Track Sequence"
      data-testid="soundstage-hero-container"
      data-webgl-ready={isReady ? "true" : "initializing"}
      data-active-station={activeStationIndex}
      className={cn(
        "relative w-full h-full overflow-hidden select-none rounded-2xl border border-white/[0.08] bg-[#08090C] shadow-2xl",
        className
      )}
    >
      {/* 3D WebGL Scene Mount */}
      <div
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity duration-700 ease-out z-10",
          isReady ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <SoundstageScene
          ref={sceneRef}
          isPaused={userPaused}
          reducedMotion={reducedMotion}
          activeStationIndex={activeStationIndex}
          onStationChange={handleStationChange}
          onHoverComponent={handleHover}
          onReady={handleReady}
        />
      </div>

      {/* Cinematic Studio Fallback */}
      <div
        className={cn(
          "absolute inset-0 z-0 transition-opacity duration-700 ease-out",
          isReady ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <SoundstageFallback />
      </div>

      {/* Interactive HUD Track Sequence Controls Overlay */}
      <SoundstageControls
        isReady={isReady}
        isPaused={userPaused}
        activeStationIndex={activeStationIndex}
        sequencePhase={sequencePhase}
        stationLabel={stationLabel}
        hoveredComponent={hoveredComponent}
        onSelectStation={handleSelectStation}
        onResetSequence={handleResetSequence}
        onTogglePause={handleTogglePause}
      />
    </div>
  );
};

export default SoundstageHero;

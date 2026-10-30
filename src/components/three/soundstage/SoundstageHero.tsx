import * as React from "react";
import { cn } from "@/lib/utils";
import { SoundstageScene, SoundstageSceneHandle } from "./SoundstageScene";
import { SoundstageFallback } from "./SoundstageFallback";
import { SoundstageControls } from "./SoundstageControls";
import {
  LightingPresetId,
  SoundstageComponent,
  DEFAULT_VIEWPOINT_ANGLE,
} from "./lighting-presets";

export interface SoundstageHeroProps {
  className?: string;
}

export const SoundstageHero: React.FC<SoundstageHeroProps> = ({ className }) => {
  const [isReady, setIsReady] = React.useState(false);
  const [viewpointAngle, setViewpointAngle] = React.useState(DEFAULT_VIEWPOINT_ANGLE);
  const [currentPreset, setCurrentPreset] = React.useState<LightingPresetId>("dramatic");
  const [isPaused, setIsPaused] = React.useState(false);
  const [hoveredComponent, setHoveredComponent] = React.useState<SoundstageComponent | null>(null);

  const sceneRef = React.useRef<SoundstageSceneHandle | null>(null);

  // Check prefers-reduced-motion
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsPaused(true);
    }

    const handler = (e: MediaQueryListEvent) => {
      setIsPaused(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleReset = () => {
    sceneRef.current?.resetView();
    setViewpointAngle(DEFAULT_VIEWPOINT_ANGLE);
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleAngleChange = (angle: number) => {
    setViewpointAngle(angle);
  };

  const handleSelectPreset = (presetId: LightingPresetId) => {
    setCurrentPreset(presetId);
  };

  return (
    <div
      role="region"
      aria-label="FilmCollab Infinite Soundstage 3D Interactive Hero"
      data-testid="soundstage-hero-container"
      data-webgl-ready={isReady ? "true" : "initializing"}
      data-lighting-preset={currentPreset}
      className={cn(
        "relative w-full h-full min-h-[340px] sm:min-h-[420px] overflow-hidden select-none rounded-2xl",
        className
      )}
    >
      {/* 3D WebGL Scene Mount */}
      <div
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity duration-700 ease-out z-10",
          isReady ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <SoundstageScene
          ref={sceneRef}
          viewpointAngle={viewpointAngle}
          onAngleChange={handleAngleChange}
          presetId={currentPreset}
          isPaused={isPaused}
          onHoverComponent={setHoveredComponent}
          onReady={() => setIsReady(true)}
        />
      </div>

      {/* Cinematic Studio Fallback (Visible before/during WebGL load) */}
      <div
        className={cn(
          "absolute inset-0 z-0 transition-opacity duration-700 ease-out",
          isReady ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <SoundstageFallback />
      </div>

      {/* Soundstage Interactive HUD Controls Overlay */}
      <SoundstageControls
        isReady={isReady}
        isPaused={isPaused}
        viewpointAngle={viewpointAngle}
        currentPreset={currentPreset}
        hoveredComponent={hoveredComponent}
        onAngleChange={(angle) => {
          sceneRef.current?.setAngle(angle);
          setViewpointAngle(angle);
        }}
        onSelectPreset={handleSelectPreset}
        onResetView={handleReset}
        onTogglePause={handleTogglePause}
      />
    </div>
  );
};

export default SoundstageHero;


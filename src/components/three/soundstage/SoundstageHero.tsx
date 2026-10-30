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

  // Stable callbacks to ensure SoundstageScene is never recreated on parent renders
  const handleAngleChange = React.useCallback((angle: number) => {
    setViewpointAngle(angle);
  }, []);

  const handleReady = React.useCallback(() => {
    setIsReady(true);
  }, []);

  const handleHover = React.useCallback((component: SoundstageComponent | null) => {
    setHoveredComponent(component);
  }, []);

  const handleSelectPreset = React.useCallback((presetId: LightingPresetId) => {
    setCurrentPreset(presetId);
  }, []);

  const handleReset = React.useCallback(() => {
    sceneRef.current?.resetView();
    setViewpointAngle(DEFAULT_VIEWPOINT_ANGLE);
  }, []);

  const handleTogglePause = React.useCallback(() => {
    setUserPaused((prev) => !prev);
  }, []);

  const handleSliderAngleChange = React.useCallback((angle: number) => {
    sceneRef.current?.setAngle(angle);
    setViewpointAngle(angle);
  }, []);

  return (
    <div
      role="region"
      aria-label="FilmCollab Infinite Soundstage 3D Interactive Hero"
      data-testid="soundstage-hero-container"
      data-webgl-ready={isReady ? "true" : "initializing"}
      data-lighting-preset={currentPreset}
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
          viewpointAngle={viewpointAngle}
          onAngleChange={handleAngleChange}
          presetId={currentPreset}
          isPaused={userPaused}
          reducedMotion={reducedMotion}
          onHoverComponent={handleHover}
          onReady={handleReady}
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
        isPaused={userPaused}
        viewpointAngle={viewpointAngle}
        currentPreset={currentPreset}
        hoveredComponent={hoveredComponent}
        onAngleChange={handleSliderAngleChange}
        onSelectPreset={handleSelectPreset}
        onResetView={handleReset}
        onTogglePause={handleTogglePause}
      />
    </div>
  );
};

export default SoundstageHero;

import * as React from "react";
import { ObsidianLensScene } from "./ObsidianLensScene";
import { ObsidianLensControls } from "./ObsidianLensControls";
import { ObsidianLensFallback } from "./ObsidianLensFallback";
import { ObsidianComponent } from "./ObsidianLensModel";
import { cn } from "@/lib/utils";

export const ObsidianLensHero: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [aperture, setAperture] = React.useState(0.70); // Default: T2.8 cinema sweet spot
  const [focus, setFocus] = React.useState(0.35); // Default: ~3 meters
  const [hoveredComponent, setHoveredComponent] = React.useState<ObsidianComponent | null>(null);

  // Accessible Reduced Motion Detection
  const [reducedMotion, setReducedMotion] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleApertureChange = React.useCallback((value: number) => {
    setAperture(value);
  }, []);

  const handleFocusChange = React.useCallback((value: number) => {
    setFocus(value);
  }, []);

  const handleReset = React.useCallback(() => {
    setAperture(0.70);
    setFocus(0.35);
    setIsPaused(false);
  }, []);

  const handleTogglePause = React.useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleHoverComponent = React.useCallback((comp: ObsidianComponent | null) => {
    setHoveredComponent(comp);
  }, []);

  const handleReady = React.useCallback(() => {
    setIsReady(true);
  }, []);

  return (
    <div
      data-testid="obsidian-lens-hero-container"
      className="relative w-full h-full min-h-[360px] sm:min-h-[440px] lg:min-h-[480px] rounded-2xl bg-gradient-to-b from-[#0D0E12] via-[#090A0D] to-[#060709] border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.85)] overflow-hidden flex items-center justify-center select-none"
    >
      {/* Studio Radial Lighting Halo behind lens */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_44%,rgba(233,180,87,0.07)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_38%,rgba(150,190,255,0.04)_0%,transparent_52%)] pointer-events-none" />

      {/* Fallback Overlay (Crossfades out once WebGL is ready) */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700 pointer-events-none z-10",
          isReady ? "opacity-0" : "opacity-100"
        )}
      >
        <ObsidianLensFallback />
      </div>

      {/* 3D Obsidian Lens Canvas */}
      <div
        className={cn(
          "w-full h-full relative transition-opacity duration-700 z-0",
          isReady ? "opacity-100" : "opacity-0"
        )}
      >
        <ObsidianLensScene
          isPaused={isPaused}
          aperture={aperture}
          focus={focus}
          reducedMotion={reducedMotion}
          onHoverComponent={handleHoverComponent}
          onFocusChange={handleFocusChange}
          onReady={handleReady}
        />
      </div>

      {/* Overlay HUD Controls */}
      <ObsidianLensControls
        isReady={isReady}
        isPaused={isPaused}
        aperture={aperture}
        focus={focus}
        hoveredComponent={hoveredComponent}
        onApertureChange={handleApertureChange}
        onReset={handleReset}
        onTogglePause={handleTogglePause}
      />
    </div>
  );
};

export default ObsidianLensHero;


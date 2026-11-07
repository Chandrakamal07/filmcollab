import * as React from "react";
import * as THREE from "three";
import {
  createCinematicWorldScene,
  CinematicWorldController,
} from "./CinematicWorldScene";
import { CinematicWorldFallback } from "./CinematicWorldFallback";
import { cn } from "@/lib/utils";

export interface CinematicWorldCanvasProps {
  pointerTarget: THREE.Vector2;
  isPaused: boolean;
  reducedMotion: boolean;
  onReady?: () => void;
  onError?: (err: Error) => void;
  className?: string;
}

export const CinematicWorldCanvas: React.FC<CinematicWorldCanvasProps> = React.memo(
  ({ pointerTarget, isPaused, reducedMotion, onReady, onError, className }) => {
    const mountRef = React.useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);

    const propsRef = React.useRef({
      pointerTarget,
      isPaused,
      reducedMotion,
    });
    propsRef.current = { pointerTarget, isPaused, reducedMotion };

    const onReadyRef = React.useRef(onReady);
    onReadyRef.current = onReady;

    const onErrorRef = React.useRef(onError);
    onErrorRef.current = onError;

    // Stable ref to trigger scheduler restart from props changes
    const requestFrameRef = React.useRef<() => void>(() => {});

    React.useEffect(() => {
      requestFrameRef.current();
    }, [isPaused, reducedMotion, pointerTarget]);

    React.useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      let disposed = false;
      let animId = 0;
      let isAnimating = false;
      let lastTime = performance.now();
      let isVisibleOnScreen = true;
      let isTabActive = true;
      let contextLost = false;

      // Pointer parallax smoothed vector
      const pointerSmooth = new THREE.Vector2(0, 0);
      const zeroVec = new THREE.Vector2(0, 0);

      // Single Scheduler functions
      const startScheduler = () => {
        if (disposed || isAnimating || !isVisibleOnScreen || !isTabActive || contextLost) return;
        isAnimating = true;
        lastTime = performance.now();
        animId = requestAnimationFrame(animate);
      };

      const stopScheduler = () => {
        isAnimating = false;
        if (animId) {
          cancelAnimationFrame(animId);
          animId = 0;
        }
      };

      requestFrameRef.current = startScheduler;

      // Initialize the scene safely
      let controller: CinematicWorldController;
      try {
        controller = createCinematicWorldScene(
          container,
          () => {
            if (!disposed) {
              setIsReady(true);
              onReadyRef.current?.();
              startScheduler();
            }
          },
          (err) => {
            if (!disposed) {
              console.error("[CinematicWorldCanvas] Scene error:", err);
              setHasError(true);
              onErrorRef.current?.(err);
            }
          }
        );
      } catch (err) {
        console.error("[CinematicWorldCanvas] Initialization failed:", err);
        setHasError(true);
        onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      // Expose diagnostic handle for testing and inspection (DEV only)
      if (import.meta.env.DEV && typeof window !== "undefined") {
        (window as unknown as { __cinematicWorld?: unknown }).__cinematicWorld = {
          getLayerPositions: () =>
            controller.layers.map((l) => ({
              x: l.group.position.x,
              y: l.group.position.y,
              z: l.group.position.z,
            })),
          getLayerRotations: () =>
            controller.layers.map((l) => ({
              x: l.group.rotation.x,
              y: l.group.rotation.y,
              z: l.group.rotation.z,
            })),
          getCameraPosition: () => ({
            x: controller.camera.position.x,
            y: controller.camera.position.y,
            z: controller.camera.position.z,
          }),
          getActiveTime: () => controller.getActiveTime(),
          isReady: () => controller.isReady(),
        };
      }

      // Responsive Resize
      const handleResize = () => {
        if (!container || disposed) return;
        const w = container.clientWidth || window.innerWidth || 1200;
        const h = container.clientHeight || 700;
        controller.camera.aspect = w / h;
        controller.camera.updateProjectionMatrix();
        controller.renderer.setSize(w, h);
        startScheduler();
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      // Visibility Observer
      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isVisibleOnScreen = entry ? entry.isIntersecting : true;
          if (isVisibleOnScreen && isTabActive) {
            startScheduler();
          } else {
            stopScheduler();
          }
        },
        { threshold: 0.05 }
      );
      intersectionObserver.observe(container);

      const onVisibilityChange = () => {
        isTabActive = !document.hidden;
        if (isTabActive && isVisibleOnScreen) {
          startScheduler();
        } else {
          stopScheduler();
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);

      // Context Loss Handling
      const onContextLost = (e: Event) => {
        e.preventDefault();
        console.warn("[CinematicWorld] WebGL context lost");
        contextLost = true;
        stopScheduler();
      };
      const onContextRestored = () => {
        console.log("[CinematicWorld] WebGL context restored");
        contextLost = false;
        handleResize();
        startScheduler();
      };
      controller.renderer.domElement.addEventListener("webglcontextlost", onContextLost);
      controller.renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

      // Main RAF Loop
      const animate = (time: number) => {
        if (disposed) return;

        if (!isVisibleOnScreen || !isTabActive || contextLost) {
          stopScheduler();
          return;
        }

        const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;

        const { pointerTarget: pTarget, isPaused: paused, reducedMotion: redMotion } = propsRef.current;
        const isRunning = !paused && !redMotion;

        // Check for coarse pointer (touch device) or reduced motion
        const isCoarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
        const allowParallax = !redMotion && !isCoarse;

        if (allowParallax) {
          // Exponential decay pointer smoothing (independent of framerate)
          const blend = 1 - Math.exp(-5 * deltaSeconds);
          pointerSmooth.lerp(pTarget, blend);
        } else {
          pointerSmooth.set(0, 0);
        }

        const isMobile = (container.clientWidth || 1200) < 768;
        controller.update(deltaSeconds, isRunning, pointerSmooth, isMobile);

        // Check whether scheduler can settle when paused
        const targetVec = allowParallax ? pTarget : zeroVec;
        const pointerSettled = pointerSmooth.distanceTo(targetVec) < 0.001;

        if (!isRunning && pointerSettled && controller.isReady()) {
          // Both animation and pointer damping have settled completely: stop RAF
          stopScheduler();
          return;
        }

        animId = requestAnimationFrame(animate);
      };

      // Start initial scheduler
      startScheduler();

      return () => {
        disposed = true;
        stopScheduler();
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);

        controller.renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        controller.renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);

        if (import.meta.env.DEV && typeof window !== "undefined") {
          delete (window as unknown as { __cinematicWorld?: unknown }).__cinematicWorld;
        }

        controller.dispose();
      };
    }, []);

    const showFallback = hasError || !isReady;

    return (
      <div className={cn("relative w-full h-full overflow-hidden select-none", className)}>
        {/* Fallback Overlay (Smooth crossfade out once WebGL is ready) */}
        <div
          aria-hidden={!showFallback}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 pointer-events-none z-0",
            showFallback ? "opacity-100" : "opacity-0"
          )}
        >
          <CinematicWorldFallback />
        </div>

        {/* 3D WebGL Canvas Mount */}
        <div
          ref={mountRef}
          data-testid="cinematic-world-canvas-mount"
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-700 z-0",
            isReady && !hasError ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    );
  }
);

CinematicWorldCanvas.displayName = "CinematicWorldCanvas";
export default CinematicWorldCanvas;

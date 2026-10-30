import * as React from "react";
import * as THREE from "three";
import {
  createGoldenReelScene,
  GoldenReelController,
} from "./GoldenReelScene";
import { GoldenReelFallback } from "./GoldenReelFallback";
import { cn } from "@/lib/utils";

export interface GoldenReelCanvasProps {
  pointerTarget: THREE.Vector2;
  isPaused: boolean;
  reducedMotion: boolean;
  onReady?: () => void;
  onError?: (err: Error) => void;
  className?: string;
}

export const GoldenReelCanvas: React.FC<GoldenReelCanvasProps> = React.memo(
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

      const pointerSmooth = new THREE.Vector2(0, 0);
      const zeroVec = new THREE.Vector2(0, 0);

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

      let controller: GoldenReelController;
      try {
        controller = createGoldenReelScene(
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
              console.error("[GoldenReelCanvas] Scene error:", err);
              setHasError(true);
              onErrorRef.current?.(err);
            }
          }
        );
      } catch (err) {
        console.error("[GoldenReelCanvas] Initialization failed:", err);
        setHasError(true);
        onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      // Expose diagnostic handle for automated verification in DEV mode
      if (import.meta.env.DEV && typeof window !== "undefined") {
        (window as unknown as { __goldenReel?: unknown }).__goldenReel = {
          getSequenceSample: () => controller.getSequenceSample(),
          getActiveTime: () => controller.getActiveTime(),
          seekTime: (t: number) => controller.seekTime(t),
          toggleHelpers: (visible?: boolean) => controller.toggleHelpers(visible),
          getCameraPosition: () => ({
            x: controller.camera.position.x,
            y: controller.camera.position.y,
            z: controller.camera.position.z,
          }),
          getReelRotation: () => controller.reel.rotatingSpool.rotation.z,
          getRollerRotations: () => ({
            upper: controller.filmSystem.upperRoller.rotation.y,
            lower: controller.filmSystem.lowerRoller.rotation.y,
          }),
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

      // WebGL Context Loss & Restoration
      const onContextLost = (e: Event) => {
        e.preventDefault();
        console.warn("[GoldenReel] WebGL context lost");
        contextLost = true;
        stopScheduler();
      };
      const onContextRestored = () => {
        console.log("[GoldenReel] WebGL context restored");
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

        const isCoarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
        const allowParallax = !redMotion && !isCoarse;

        if (allowParallax) {
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
          stopScheduler();
          return;
        }

        animId = requestAnimationFrame(animate);
      };

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
          delete (window as unknown as { __goldenReel?: unknown }).__goldenReel;
        }

        controller.dispose();
      };
    }, []);

    const showFallback = hasError || !isReady;

    return (
      <div className={cn("relative w-full h-full overflow-hidden select-none", className)}>
        {/* Accessible Fallback Overlay */}
        <div
          aria-hidden={!showFallback}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 pointer-events-none z-0",
            showFallback ? "opacity-100" : "opacity-0"
          )}
        >
          <GoldenReelFallback />
        </div>

        {/* 3D WebGL Canvas Mount */}
        <div
          ref={mountRef}
          data-testid="golden-reel-canvas-mount"
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-700 z-0",
            isReady && !hasError ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    );
  }
);

GoldenReelCanvas.displayName = "GoldenReelCanvas";
export default GoldenReelCanvas;


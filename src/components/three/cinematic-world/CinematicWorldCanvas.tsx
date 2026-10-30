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
  className?: string;
}

export const CinematicWorldCanvas: React.FC<CinematicWorldCanvasProps> = React.memo(
  ({ pointerTarget, isPaused, reducedMotion, onReady, className }) => {
    const mountRef = React.useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = React.useState(false);

    const propsRef = React.useRef({
      pointerTarget,
      isPaused,
      reducedMotion,
    });
    propsRef.current = { pointerTarget, isPaused, reducedMotion };

    const onReadyRef = React.useRef(onReady);
    onReadyRef.current = onReady;

    React.useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      let disposed = false;
      let animId = 0;
      let lastTime = performance.now();
      let isVisibleOnScreen = true;
      let isTabActive = true;

      // Pointer parallax smoothed vector
      const pointerSmooth = new THREE.Vector2(0, 0);

      // Initialize the scene
      const controller: CinematicWorldController = createCinematicWorldScene(
        container,
        () => {
          if (!disposed) {
            setIsReady(true);
            onReadyRef.current?.();
          }
        }
      );

      // Expose diagnostic handle for testing and inspection
      if (typeof window !== "undefined") {
        (window as unknown as { __cinematicWorld?: unknown }).__cinematicWorld = {
          getLayerPositions: () =>
            controller.layers.map((l) => ({
              x: l.group.position.x,
              y: l.group.position.y,
              z: l.group.position.z,
            })),
          getCameraPosition: () => ({
            x: controller.camera.position.x,
            y: controller.camera.position.y,
            z: controller.camera.position.z,
          }),
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
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      // Visibility & RAF Scheduler
      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isVisibleOnScreen = entry ? entry.isIntersecting : true;
          if (isVisibleOnScreen && isTabActive) {
            lastTime = performance.now();
            if (!animId) {
              animId = requestAnimationFrame(animate);
            }
          }
        },
        { threshold: 0.05 }
      );
      intersectionObserver.observe(container);

      const onVisibilityChange = () => {
        isTabActive = !document.hidden;
        if (isTabActive && isVisibleOnScreen) {
          lastTime = performance.now();
          if (!animId) {
            animId = requestAnimationFrame(animate);
          }
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);

      // Context Loss Handling
      const onContextLost = (e: Event) => {
        e.preventDefault();
        console.warn("Cinematic World WebGL context lost");
      };
      const onContextRestored = () => {
        console.log("Cinematic World WebGL context restored");
        handleResize();
      };
      controller.renderer.domElement.addEventListener("webglcontextlost", onContextLost);
      controller.renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

      // Main RAF Loop
      const animate = (time: number) => {
        if (disposed) return;

        if (!isVisibleOnScreen || !isTabActive) {
          animId = 0;
          return;
        }

        animId = requestAnimationFrame(animate);

        const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;

        const { pointerTarget: pTarget, isPaused: paused, reducedMotion: redMotion } = propsRef.current;
        const isRunning = !paused && !redMotion;

        // Smooth pointer damping
        if (redMotion) {
          pointerSmooth.set(0, 0);
        } else {
          pointerSmooth.lerp(pTarget, 0.06);
        }

        const isMobile = (container.clientWidth || 1200) < 768;
        controller.update(deltaSeconds, isRunning, pointerSmooth, isMobile);
      };

      animId = requestAnimationFrame(animate);

      return () => {
        disposed = true;
        cancelAnimationFrame(animId);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);

        controller.renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        controller.renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);

        if (typeof window !== "undefined") {
          delete (window as unknown as { __cinematicWorld?: unknown }).__cinematicWorld;
        }

        controller.dispose();
      };
    }, []);

    return (
      <div className={cn("relative w-full h-full overflow-hidden select-none", className)}>
        {/* Fallback Overlay (Crossfades out once WebGL is ready) */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 pointer-events-none z-0",
            isReady ? "opacity-0" : "opacity-100"
          )}
        >
          <CinematicWorldFallback />
        </div>

        {/* 3D WebGL Canvas Mount */}
        <div
          ref={mountRef}
          data-testid="cinematic-world-canvas-mount"
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-1000 z-0",
            isReady ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    );
  }
);

CinematicWorldCanvas.displayName = "CinematicWorldCanvas";
export default CinematicWorldCanvas;


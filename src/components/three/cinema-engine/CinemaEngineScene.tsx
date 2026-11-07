import * as React from "react";
import * as THREE from "three";
import { CameraAssemblyController, createCameraAssembly } from "./CameraAssembly";
import {
  ASSEMBLY_CONFIG,
  CameraPartConfig,
  DEFAULT_ASSEMBLY_VALUE,
  ENTRANCE_ASSEMBLED_VALUE,
  ENTRANCE_DURATION_SECONDS,
  ENTRANCE_START_VALUE,
} from "./assembly-config";

export interface CinemaEngineSceneProps {
  className?: string;
  assemblyValue: number;
  onAssemblyChange: (value: number) => void;
  isPaused: boolean;
  onHoverComponent: (component: CameraPartConfig | null) => void;
  onReady: () => void;
}

export interface CinemaEngineSceneHandle {
  resetView: () => void;
  focusComponent: (name: string) => void;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const CinemaEngineScene = React.forwardRef<
  CinemaEngineSceneHandle,
  CinemaEngineSceneProps
>(({ className, assemblyValue, onAssemblyChange, isPaused, onHoverComponent, onReady }, ref) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasMountRef = React.useRef<HTMLDivElement | null>(null);
  const controllerRef = React.useRef<CameraAssemblyController | null>(null);

  // Sync ref to avoid stale closures in frame loops
  const assemblyValueRef = React.useRef(assemblyValue);
  assemblyValueRef.current = assemblyValue;

  const isPausedRef = React.useRef(isPaused);
  isPausedRef.current = isPaused;

  const isUserInteractingRef = React.useRef(false);
  const entranceCompleteRef = React.useRef(false);

  // Viewpoint tilt refs
  const pointerNormalized = React.useRef({ x: 0, y: 0 });
  const pointerCurrent = React.useRef({ x: 0, y: 0 });

  React.useImperativeHandle(ref, () => ({
    resetView: () => {
      onAssemblyChange(DEFAULT_ASSEMBLY_VALUE);
      pointerNormalized.current.x = 0;
      pointerNormalized.current.y = 0;
      controllerRef.current?.setAssembly(DEFAULT_ASSEMBLY_VALUE);
      controllerRef.current?.setHighlightedPart(null);
      onHoverComponent(null);
    },
    focusComponent: (name: string) => {
      const part = ASSEMBLY_CONFIG.find((p) => p.name === name);
      if (part) {
        controllerRef.current?.setHighlightedPart(name);
        onHoverComponent(part);
      }
    },
  }));

  React.useEffect(() => {
    if (!containerRef.current || !canvasMountRef.current) return;
    const container = containerRef.current;
    const canvasMount = canvasMountRef.current;
    let isDisposed = false;

    // Media queries
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = motionQuery.matches;
    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    motionQuery.addEventListener("change", handleMotionChange);

    const isCoarse = window.matchMedia("(pointer: coarse), (hover: none)").matches;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 320);

    const camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 50);
    camera.position.set(0.18, 0.12, 5.6);
    camera.lookAt(0.24, 0.12, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.error("[Cinema Engine] WebGL initialization failed", err);
      return;
    }

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarse ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvasDom = renderer.domElement;
    canvasDom.setAttribute("data-testid", "cinema-engine-webgl-canvas");
    canvasDom.style.width = "100%";
    canvasDom.style.height = "100%";
    canvasDom.style.display = "block";
    canvasDom.style.touchAction = "pan-y pinch-zoom";
    canvasMount.appendChild(canvasDom);

    // 2. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.88);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ee, 1.55);
    keyLight.position.set(3.2, 3.6, 4.2);
    scene.add(keyLight);

    const warmRimLight = new THREE.DirectionalLight(0xe9b457, 2.8);
    warmRimLight.position.set(4.2, 1.6, -2.6);
    scene.add(warmRimLight);

    const coolFillLight = new THREE.DirectionalLight(0x8a9bb5, 0.42);
    coolFillLight.position.set(-3.2, -2.0, 2.0);
    scene.add(coolFillLight);

    const softBounceLight = new THREE.DirectionalLight(0x161a20, 0.35);
    softBounceLight.position.set(0, -3.0, 1.0);
    scene.add(softBounceLight);

    // 3. Diagonal Presentation Group
    const presentationGroup = new THREE.Group();
    // Diagonal orientation: angles the camera so the body sits rear-left and optics explode front-right
    presentationGroup.rotation.set(0.12, -0.68, -0.06);
    scene.add(presentationGroup);

    // 4. Load Camera Assembly
    let assembly: CameraAssemblyController | null = null;
    createCameraAssembly("/models/cinema-engine.glb").then((loadedAssembly) => {
      if (isDisposed) {
        loadedAssembly.dispose();
        return;
      }
      assembly = loadedAssembly;
      controllerRef.current = loadedAssembly;
      presentationGroup.add(loadedAssembly.root);

      // Initial assembly value
      loadedAssembly.setAssembly(prefersReducedMotion ? DEFAULT_ASSEMBLY_VALUE : ENTRANCE_START_VALUE);
      renderer.render(scene, camera);
      onReady();
      startLoop();
    });

    // 5. Raycasting for Component Hover
    const raycaster = new THREE.Raycaster();
    let currentHoveredName: string | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      pointerNormalized.current.x = nx;
      pointerNormalized.current.y = ny;

      if (assembly && !isCoarse) {
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
        const hovered = assembly.getHoveredComponent(raycaster);
        if (hovered?.name !== currentHoveredName) {
          currentHoveredName = hovered ? hovered.name : null;
          assembly.setHighlightedPart(currentHoveredName);
          onHoverComponent(hovered);
        }
      }
      startLoop();
    };

    const handlePointerLeave = () => {
      pointerNormalized.current.x = 0;
      pointerNormalized.current.y = 0;
      if (assembly && currentHoveredName) {
        currentHoveredName = null;
        assembly.setHighlightedPart(null);
        onHoverComponent(null);
      }
      startLoop();
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    // 6. Horizontal Drag to Assemble
    let drag: {
      pointerId: number;
      startX: number;
      startValue: number;
      width: number;
    } | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("button, input, a, select, textarea")) return;

      isUserInteractingRef.current = true;
      entranceCompleteRef.current = true;

      drag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startValue: assemblyValueRef.current,
        width: Math.max(container.clientWidth, 1),
      };

      container.setPointerCapture(e.pointerId);
      startLoop();
    };

    const handleDragMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const change = (e.clientX - drag.startX) / drag.width;
      const newValue = THREE.MathUtils.clamp(drag.startValue + change * 1.6, 0, 1);
      onAssemblyChange(newValue);
      startLoop();
    };

    const handleDragEnd = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const pId = drag.pointerId;
      drag = null;
      if (container.hasPointerCapture(pId)) {
        container.releasePointerCapture(pId);
      }
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handleDragMove);
    container.addEventListener("pointerup", handleDragEnd);
    container.addEventListener("pointercancel", handleDragEnd);
    container.addEventListener("lostpointercapture", handleDragEnd);

    // 7. Responsive Resize
    const handleResize = () => {
      if (!container || isDisposed) return;
      const curW = Math.max(container.clientWidth, 320);
      const curH = Math.max(container.clientHeight, 320);
      camera.aspect = curW / curH;

      if (curW < 550) {
        camera.position.z = 7.2;
        camera.position.x = 0.05;
      } else if (curW < 950) {
        camera.position.z = 6.4;
        camera.position.x = 0.12;
      } else {
        camera.position.z = 5.6;
        camera.position.x = 0.18;
      }

      camera.updateProjectionMatrix();
      renderer.setSize(curW, curH);
      startLoop();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 8. Visibility & Intersection Observers
    let isIntersecting = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries[0]?.isIntersecting ?? true;
        if (isIntersecting) {
          lastFrameTime = performance.now();
          startLoop();
        }
      },
      { threshold: 0.05 },
    );
    intersectionObserver.observe(container);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isIntersecting) {
        lastFrameTime = performance.now();
        startLoop();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 9. Coordinated Animation Loop
    let rafId = 0;
    let isRunning = false;
    let lastFrameTime = performance.now();
    let entranceElapsedTime = 0;

    function tick() {
      if (isDisposed || !isIntersecting || document.visibilityState === "hidden") {
        isRunning = false;
        return;
      }

      const now = performance.now();
      const deltaSec = Math.min((now - lastFrameTime) / 1000, 0.05); // Capped at 50ms
      lastFrameTime = now;

      // A) 2.4s Directed Entrance: 0.8 -> 0.0 -> 0.35
      if (!entranceCompleteRef.current && !prefersReducedMotion && !isUserInteractingRef.current) {
        entranceElapsedTime += deltaSec;
        const progress = Math.min(entranceElapsedTime / ENTRANCE_DURATION_SECONDS, 1.0);

        let targetVal: number;
        if (progress < 0.45) {
          // 0.8 -> 0.0
          const phaseProgress = easeInOutCubic(progress / 0.45);
          targetVal = ENTRANCE_START_VALUE + (ENTRANCE_ASSEMBLED_VALUE - ENTRANCE_START_VALUE) * phaseProgress;
        } else {
          // 0.0 -> 0.35
          const phaseProgress = easeInOutCubic((progress - 0.45) / 0.55);
          targetVal = ENTRANCE_ASSEMBLED_VALUE + (DEFAULT_ASSEMBLY_VALUE - ENTRANCE_ASSEMBLED_VALUE) * phaseProgress;
        }

        assembly?.setAssembly(targetVal);
        onAssemblyChange(targetVal);

        if (progress >= 1.0) {
          entranceCompleteRef.current = true;
        }
      } else {
        // User controlled or settled
        assembly?.setAssembly(assemblyValueRef.current);
      }

      // B) Update Assembly (Part movement along optical axis, focus ring, aperture)
      assembly?.update(deltaSec, !isPausedRef.current, prefersReducedMotion);

      // C) Subtle Bounded Viewpoint Parallax Tilt
      const dampingFactor = 4.5;
      pointerCurrent.current.x = THREE.MathUtils.damp(
        pointerCurrent.current.x,
        pointerNormalized.current.x,
        dampingFactor,
        deltaSec,
      );
      pointerCurrent.current.y = THREE.MathUtils.damp(
        pointerCurrent.current.y,
        pointerNormalized.current.y,
        dampingFactor,
        deltaSec,
      );

      if (!prefersReducedMotion) {
        presentationGroup.rotation.y = -0.68 + pointerCurrent.current.x * 0.035;
        presentationGroup.rotation.x = 0.12 - pointerCurrent.current.y * 0.025;
      }

      renderer.render(scene, camera);

      // Continue rendering while ambient motion or entrance is active
      const isSettled =
        isPausedRef.current &&
        Math.abs(pointerCurrent.current.x - pointerNormalized.current.x) < 0.001 &&
        Math.abs(assembly?.getAssembly() ?? 0 - assemblyValueRef.current) < 0.001;

      if (!isSettled) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        isRunning = false;
      }
    }

    function startLoop() {
      if (!isRunning && !isDisposed) {
        isRunning = true;
        lastFrameTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    }

    // 10. Cleanup
    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(rafId);

      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handleDragMove);
      container.removeEventListener("pointerup", handleDragEnd);
      container.removeEventListener("pointercancel", handleDragEnd);
      container.removeEventListener("lostpointercapture", handleDragEnd);
      motionQuery.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      assembly?.dispose();
      renderer.dispose();
      if (canvasMount && canvasMount.contains(canvasDom)) {
        canvasMount.removeChild(canvasDom);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[340px] sm:min-h-[420px] select-none touch-pan-y cursor-grab active:cursor-grabbing"
    >
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
});

CinemaEngineScene.displayName = "CinemaEngineScene";
export default CinemaEngineScene;


import * as React from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { FilmSculptureFallback } from "./FilmSculptureFallback";

export interface FilmSculptureCanvasProps {
  className?: string;
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// Cubic ease-out
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
}

interface FrameMeshDef {
  group: THREE.Group;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  startRot: THREE.Euler;
  targetRot: THREE.Euler;
}

export const FilmSculptureCanvas: React.FC<FilmSculptureCanvasProps> = ({ className }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasMountRef = React.useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = React.useState<boolean | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  // Pointer state in refs to avoid re-renders
  const pointerTarget = React.useRef({ x: 0, y: 0 });
  const pointerCurrent = React.useRef({ x: 0, y: 0 });
  const isPointerInside = React.useRef(false);

  React.useEffect(() => {
    const supported = isWebGLAvailable();
    setWebglSupported(supported);
    if (!supported || !containerRef.current || !canvasMountRef.current) return;

    const container = containerRef.current;
    const canvasMount = canvasMountRef.current;
    let isDisposed = false;

    // Detect reduced motion and coarse pointer
    const mediaQueryMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = mediaQueryMotion.matches;
    const mediaQueryPointer = window.matchMedia("(pointer: coarse), (hover: none)");
    const isCoarsePointer = mediaQueryPointer.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    mediaQueryMotion.addEventListener("change", handleMotionChange);

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();

    const initialW = Math.max(container.clientWidth, 320);
    const initialH = Math.max(container.clientHeight, 320);

    const camera = new THREE.PerspectiveCamera(36, initialW / initialH, 0.1, 50);
    camera.position.set(0.25, 0.28, 6.2);
    camera.lookAt(0.35, 0.28, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    renderer.setSize(initialW, initialH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvasDom = renderer.domElement;
    canvasDom.setAttribute("data-testid", "cinematic-frame-flow-canvas");
    canvasDom.style.width = "100%";
    canvasDom.style.height = "100%";
    canvasDom.style.display = "block";
    canvasDom.style.outline = "none";

    // Attach to mount
    canvasMount.appendChild(canvasDom);

    // Track resources for reliable disposal
    const ownedGeometries: THREE.BufferGeometry[] = [];
    const ownedMaterials: THREE.Material[] = [];
    const ownedTextures: THREE.Texture[] = [];

    const registerGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      ownedGeometries.push(g);
      return g;
    };
    const registerMat = <T extends THREE.Material>(m: T): T => {
      ownedMaterials.push(m);
      return m;
    };
    const registerTex = (t: THREE.Texture): THREE.Texture => {
      ownedTextures.push(t);
      return t;
    };

    // 2. Studio Lighting (Soft neutral key + subtle warm amber rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff6ea, 1.4);
    keyLight.position.set(3.0, 3.2, 4.0);
    scene.add(keyLight);

    const warmRimLight = new THREE.DirectionalLight(0xe9b457, 2.2);
    warmRimLight.position.set(3.8, 1.2, -2.5);
    scene.add(warmRimLight);

    const coolFillLight = new THREE.DirectionalLight(0x90a0b2, 0.35);
    coolFillLight.position.set(-3.2, -2.0, 1.8);
    scene.add(coolFillLight);

    // 3. Materials
    const chassisMaterial = registerMat(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#16181D"),
        roughness: 0.58,
        metalness: 0.28,
      }),
    );

    const amberRimMaterial = registerMat(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#E9B457"),
        emissive: new THREE.Color("#3D2B0E"),
        emissiveIntensity: 0.45,
        roughness: 0.32,
        metalness: 0.75,
      }),
    );

    // 4. Create Cinematic Frame Helper
    function createCinematicFrame(
      width: number,
      height: number,
      depth: number,
      texture: THREE.Texture,
      title: string,
      tag: string,
    ): THREE.Group {
      const frameGroup = new THREE.Group();

      // Outer Chassis (matte graphite bezel)
      const chassisGeo = registerGeo(new THREE.BoxGeometry(width, height, depth));
      const chassisMesh = new THREE.Mesh(chassisGeo, chassisMaterial);
      chassisMesh.castShadow = true;
      chassisMesh.receiveShadow = true;
      frameGroup.add(chassisMesh);

      // Thin Amber Accent Backing (peeks out around the photo as an elegant 1.5% rim)
      const rimGeo = registerGeo(new THREE.PlaneGeometry(width * 0.965, height * 0.965));
      const rimMesh = new THREE.Mesh(rimGeo, amberRimMaterial);
      rimMesh.position.z = depth * 0.5 + 0.001;
      frameGroup.add(rimMesh);

      // Photographic Image Face (sits cleanly atop the rim backing)
      const imageMat = registerMat(
        new THREE.MeshStandardMaterial({
          map: texture,
          color: new THREE.Color(0xffffff),
          roughness: 0.35,
          metalness: 0.05,
        }),
      );
      const imageGeo = registerGeo(new THREE.PlaneGeometry(width * 0.945, height * 0.945));
      const imageMesh = new THREE.Mesh(imageGeo, imageMat);
      imageMesh.position.z = depth * 0.5 + 0.0025;
      frameGroup.add(imageMesh);

      // Subtle contact shadow beneath the frame
      const shadowGeo = registerGeo(new THREE.PlaneGeometry(width * 1.05, height * 0.25));
      const shadowMat = registerMat(
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(0x000000),
          transparent: true,
          opacity: 0.35,
        }),
      );
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.position.set(0, -height * 0.52, -depth * 0.5);
      shadowMesh.rotation.x = Math.PI * 0.45;
      frameGroup.add(shadowMesh);

      return frameGroup;
    }

    // 5. Root Composition Group
    const compositionGroup = new THREE.Group();
    compositionGroup.position.set(0.08, 0.36, 0.0);
    scene.add(compositionGroup);

    // 6. Asynchronous Texture Loading & Frame Setup
    const textureLoader = new THREE.TextureLoader();
    const frameImageUrls = [
      "/images/hero/frame-supporting-1.jpg",
      "/images/hero/frame-main.jpg",
      "/images/hero/frame-supporting-2.jpg",
    ];

    const frameDefs: FrameMeshDef[] = [];

    let loadedCount = 0;
    const textures: (THREE.Texture | null)[] = [null, null, null];

    frameImageUrls.forEach((url, index) => {
      textureLoader.load(
        url,
        (tex) => {
          if (isDisposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          registerTex(tex);

          textures[index] = tex;
          loadedCount++;

          if (loadedCount === frameImageUrls.length) {
            initFrames();
          }
        },
        undefined,
        (err) => {
          console.warn(`[Hero WebGL] Failed to load texture ${url}, using fallback`, err);
          if (!isDisposed) {
            setWebglSupported(false);
          }
        },
      );
    });

    function initFrames() {
      if (isDisposed) return;

      // Frame 1: Hero Frame (Foreground focal point)
      const frame1 = createCinematicFrame(2.9, 1.68, 0.05, textures[0]!, "01 // PRODUCTION", "35MM WIDESCREEN");
      const f1TargetPos = new THREE.Vector3(0.38, 0.12, 0.42);
      const f1StartPos = prefersReducedMotion
        ? f1TargetPos.clone()
        : new THREE.Vector3(0.38, 0.12, -0.32);
      const f1TargetRot = new THREE.Euler(0.025, -0.12, 0.012);
      const f1StartRot = prefersReducedMotion
        ? f1TargetRot.clone()
        : new THREE.Euler(0.01, -0.04, 0.005);
      frame1.position.copy(f1StartPos);
      frame1.rotation.copy(f1StartRot);
      compositionGroup.add(frame1);

      frameDefs.push({
        group: frame1,
        startPos: f1StartPos,
        targetPos: f1TargetPos,
        startRot: f1StartRot,
        targetRot: f1TargetRot,
      });

      // Frame 2: Supporting Frame 1 (Upper Right Depth Layer)
      const frame2 = createCinematicFrame(2.25, 1.30, 0.04, textures[1]!, "02 // CAMERA UNIT", "CINEMATOGRAPHY");
      const f2TargetPos = new THREE.Vector3(1.65, 0.92, -0.65);
      const f2StartPos = prefersReducedMotion
        ? f2TargetPos.clone()
        : new THREE.Vector3(1.12, 0.65, -0.32);
      const f2TargetRot = new THREE.Euler(0.045, -0.22, 0.03);
      const f2StartRot = prefersReducedMotion
        ? f2TargetRot.clone()
        : new THREE.Euler(0.02, -0.08, 0.01);
      frame2.position.copy(f2StartPos);
      frame2.rotation.copy(f2StartRot);
      compositionGroup.add(frame2);

      frameDefs.push({
        group: frame2,
        startPos: f2StartPos,
        targetPos: f2TargetPos,
        startRot: f2StartRot,
        targetRot: f2TargetRot,
      });

      // Frame 3: Supporting Frame 2 (Lower Left Depth Layer)
      const frame3 = createCinematicFrame(1.95, 1.14, 0.035, textures[2]!, "03 // OPTICS", "ANAMORPHIC");
      const f3TargetPos = new THREE.Vector3(-0.58, -0.48, -1.15);
      const f3StartPos = prefersReducedMotion
        ? f3TargetPos.clone()
        : new THREE.Vector3(-0.22, -0.26, -0.52);
      const f3TargetRot = new THREE.Euler(0.015, -0.07, -0.02);
      const f3StartRot = prefersReducedMotion
        ? f3TargetRot.clone()
        : new THREE.Euler(0.005, -0.03, -0.008);
      frame3.position.copy(f3StartPos);
      frame3.rotation.copy(f3StartRot);
      compositionGroup.add(frame3);

      frameDefs.push({
        group: frame3,
        startPos: f3StartPos,
        targetPos: f3TargetPos,
        startRot: f3StartRot,
        targetRot: f3TargetRot,
      });

      // Perform first clean render before crossfade
      renderer.render(scene, camera);
      setIsReady(true);

      // Start the directed entrance loop
      startRenderLoop();
    }

    // 7. Pointer Movement & Damping
    const handlePointerMove = (e: PointerEvent) => {
      if (isCoarsePointer) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      pointerTarget.current.x = Math.max(-1, Math.min(1, nx));
      pointerTarget.current.y = Math.max(-1, Math.min(1, ny));
      isPointerInside.current = true;

      startRenderLoop();
    };

    const handlePointerLeave = () => {
      pointerTarget.current.x = 0;
      pointerTarget.current.y = 0;
      isPointerInside.current = false;
      startRenderLoop();
    };

    const handlePointerEnter = () => {
      isPointerInside.current = true;
      startRenderLoop();
    };

    container.addEventListener("pointermove", handlePointerMove, { passive: true });
    container.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    container.addEventListener("pointerenter", handlePointerEnter, { passive: true });

    // 8. Responsive Resize Handling
    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;

      // Adjust camera distance for smaller containers to keep composition balanced
      if (w < 600) {
        camera.position.z = 7.6;
        camera.position.x = 0.15;
      } else if (w < 1024) {
        camera.position.z = 6.8;
        camera.position.x = 0.22;
      } else {
        camera.position.z = 6.2;
        camera.position.x = 0.25;
      }

      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      startRenderLoop();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 9. Intersection Observer (Pause when offscreen)
    let isIntersecting = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isIntersecting = entry?.isIntersecting ?? true;
        if (isIntersecting) {
          lastFrameTime = performance.now();
          startRenderLoop();
        }
      },
      { threshold: 0.05 },
    );
    intersectionObserver.observe(container);

    // 10. Page Visibility Handling (Pause when tab hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isIntersecting) {
        lastFrameTime = performance.now();
        startRenderLoop();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 11. Context Loss & Restoration Handling
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn("[Hero WebGL] WebGL context lost");
    };
    const handleContextRestored = () => {
      console.info("[Hero WebGL] WebGL context restored");
      startRenderLoop();
    };
    canvasDom.addEventListener("webglcontextlost", handleContextLost, false);
    canvasDom.addEventListener("webglcontextrestored", handleContextRestored, false);

    // 12. Directed Entrance & On-Demand Render Loop
    let rafId = 0;
    let isLoopRunning = false;
    let lastFrameTime = performance.now();
    let accumulatedAnimTime = 0;
    const ENTRANCE_DURATION = 1.75; // seconds

    function tick() {
      if (isDisposed || !isIntersecting || document.visibilityState === "hidden") {
        isLoopRunning = false;
        return;
      }

      const now = performance.now();
      // Delta time capped to 100ms to avoid huge jumps on wake
      const deltaSec = Math.min((now - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now;

      let needsContinuedRendering = false;

      // A) Progress Entrance Animation
      if (!prefersReducedMotion && accumulatedAnimTime < ENTRANCE_DURATION) {
        accumulatedAnimTime += deltaSec;
        const rawProgress = Math.min(accumulatedAnimTime / ENTRANCE_DURATION, 1.0);
        const progress = easeOutCubic(rawProgress);

        for (const def of frameDefs) {
          def.group.position.lerpVectors(def.startPos, def.targetPos, progress);
          def.group.rotation.x = def.startRot.x + (def.targetRot.x - def.startRot.x) * progress;
          def.group.rotation.y = def.startRot.y + (def.targetRot.y - def.startRot.y) * progress;
          def.group.rotation.z = def.startRot.z + (def.targetRot.z - def.startRot.z) * progress;
        }

        if (rawProgress < 1.0) {
          needsContinuedRendering = true;
        }
      }

      // B) Delta-Time Pointer Damping
      const dampingLambda = 5.2;
      pointerCurrent.current.x = THREE.MathUtils.damp(
        pointerCurrent.current.x,
        pointerTarget.current.x,
        dampingLambda,
        deltaSec,
      );
      pointerCurrent.current.y = THREE.MathUtils.damp(
        pointerCurrent.current.y,
        pointerTarget.current.y,
        dampingLambda,
        deltaSec,
      );

      const px = pointerCurrent.current.x;
      const py = pointerCurrent.current.y;

      const pointerDiff =
        Math.abs(pointerCurrent.current.x - pointerTarget.current.x) +
        Math.abs(pointerCurrent.current.y - pointerTarget.current.y);

      if (pointerDiff > 0.0003) {
        needsContinuedRendering = true;
      }

      // C) Apply Pointer Parallax & Subtle Tilt (2–3 degrees max)
      const maxTiltY = 0.052; // ~3 degrees
      const maxTiltX = 0.042; // ~2.4 degrees

      compositionGroup.rotation.y = px * maxTiltY;
      compositionGroup.rotation.x = -py * maxTiltX;

      // Subtle depth parallax on camera
      camera.position.x = 0.25 + px * 0.18;
      camera.position.y = 0.28 + py * 0.14;
      camera.lookAt(0.35 + px * 0.08, 0.28 + py * 0.05, 0);

      // Render Frame
      renderer.render(scene, camera);

      // D) Stop Rendering When Settled (On-Demand Loop)
      if (needsContinuedRendering) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        isLoopRunning = false;
      }
    }

    function startRenderLoop() {
      if (!isLoopRunning && !isDisposed) {
        isLoopRunning = true;
        lastFrameTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    }

    // 13. Teardown & Resource Disposal
    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(rafId);

      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      container.removeEventListener("pointerenter", handlePointerEnter);
      mediaQueryMotion.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      canvasDom.removeEventListener("webglcontextlost", handleContextLost);
      canvasDom.removeEventListener("webglcontextrestored", handleContextRestored);

      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      // Dispose geometries
      for (const g of ownedGeometries) {
        g.dispose();
      }
      // Dispose materials
      for (const m of ownedMaterials) {
        m.dispose();
      }
      // Dispose textures
      for (const t of ownedTextures) {
        t.dispose();
      }

      renderer.dispose();
      if (canvasMount && canvasMount.contains(canvasDom)) {
        canvasMount.removeChild(canvasDom);
      }
    };
  }, []);

  if (webglSupported === false) {
    return <FilmSculptureFallback className={className} />;
  }

  return (
    <div
      ref={containerRef}
      data-testid="film-sculpture-container"
      data-webgl-ready={isReady ? "true" : "initializing"}
      className={cn(
        "relative w-full h-full min-h-[340px] sm:min-h-[400px] overflow-hidden select-none",
        className,
      )}
    >
      {/* Dedicated Three.js canvas mount - untouched by React reconciliation */}
      <div
        ref={canvasMountRef}
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity duration-300 ease-out z-10",
          isReady ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Photographic CSS fallback layer */}
      <div
        className={cn(
          "absolute inset-0 z-0 transition-opacity duration-300 ease-out",
          isReady ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      >
        <FilmSculptureFallback />
      </div>
    </div>
  );
};

export default FilmSculptureCanvas;

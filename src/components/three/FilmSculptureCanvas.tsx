import * as React from "react";
import * as THREE from "three";
import { Play, Pause, MoveHorizontal } from "lucide-react";
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

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
}

const HERO_FRAME_URLS = [
  { url: "/images/hero/frame-main.jpg", label: "01 // PRODUCTION", tag: "35MM WIDESCREEN" },
  { url: "/images/hero/frame-supporting-1.jpg", label: "02 // STAGE LIGHTING", tag: "COLOR TEMPERATURE" },
  { url: "/images/hero/frame-supporting-2.jpg", label: "03 // ANAMORPHIC OPTICS", tag: "2.39:1 CINEMASCOPE" },
  { url: "/images/hero/frame-4.jpg", label: "04 // SOUNDSTAGE", tag: "ACOUSTIC STAGE B" },
  { url: "/images/hero/frame-5.jpg", label: "05 // CAMERA OPERATOR", tag: "A-CAMERA RIG" },
];

/**
 * Creates the subdivided 3D S-curved ribbon BufferGeometry.
 * 160 length segments x 24 height segments provide dense vertex resolution
 * for real-time traveling waves and localized Gaussian pointer deformation.
 */
function createRibbonGeometry(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.2, -0.75, -0.3),
    new THREE.Vector3(-0.9, -0.35, 0.32),
    new THREE.Vector3(0.55, 0.05, 0.75),
    new THREE.Vector3(1.95, 0.42, 0.38),
    new THREE.Vector3(2.85, 0.78, -0.65),
    new THREE.Vector3(2.45, 1.15, -1.85),
    new THREE.Vector3(1.55, 1.38, -2.85),
  ]);

  const segmentsU = 160;
  const segmentsV = 24;
  const ribbonHeight = 2.15;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segmentsU; i++) {
    const u = i / segmentsU;
    const pt = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u).normalize();

    // Cinematic banking angle along the S-curve
    const bankAngle = Math.sin(u * Math.PI) * 0.12 - (u > 0.5 ? (u - 0.5) * 0.28 : 0.0);
    const guideUp = new THREE.Vector3(0, 1, 0).applyAxisAngle(tangent, bankAngle);
    const binormal = new THREE.Vector3().crossVectors(tangent, guideUp).normalize();
    const ribbonNormal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

    for (let j = 0; j <= segmentsV; j++) {
      const v = j / segmentsV;
      const vNorm = (v - 0.5) * 2; // -1 to 1

      const vert = pt.clone().addScaledVector(ribbonNormal, (ribbonHeight / 2) * vNorm);
      positions.push(vert.x, vert.y, vert.z);
      // Map UVs: U repeats 2.5 times along the curve length, V spans 0 to 1
      uvs.push(u * 2.5, v);
    }
  }

  for (let i = 0; i < segmentsU; i++) {
    for (let j = 0; j < segmentsV; j++) {
      const a = i * (segmentsV + 1) + j;
      const b = (i + 1) * (segmentsV + 1) + j;
      const c = (i + 1) * (segmentsV + 1) + (j + 1);
      const d = i * (segmentsV + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the 35mm filmstrip atlas canvas with authentic sprockets,
 * restrained amber lines, and frame information.
 */
function createFilmstripCanvas(
  onUpdate: () => void,
): { canvas: HTMLCanvasElement; dispose: () => void } {
  const canvas = document.createElement("canvas");
  const totalFrames = HERO_FRAME_URLS.length;
  const frameWidth = 640;
  const canvasHeight = 460;
  const railHeight = 44;
  const imgHeight = canvasHeight - railHeight * 2; // 372px

  canvas.width = frameWidth * totalFrames;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, dispose: () => {} };

  // Base charcoal background
  ctx.fillStyle = "#0E1013";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function drawPerforationsAndBorders() {
    if (!ctx) return;
    const sprocketW = 14;
    const sprocketH = 20;
    const sprocketRadius = 3;
    const sprocketPitch = 38;

    // Amber accent lines separating sprockets from image area
    ctx.strokeStyle = "rgba(233, 180, 87, 0.55)";
    ctx.lineWidth = 1.5;
    // Top rail dividing line
    ctx.beginPath();
    ctx.moveTo(0, railHeight - 0.5);
    ctx.lineTo(canvas.width, railHeight - 0.5);
    ctx.stroke();

    // Bottom rail dividing line
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight - railHeight + 0.5);
    ctx.lineTo(canvas.width, canvasHeight - railHeight + 0.5);
    ctx.stroke();

    // Top & Bottom outer edge fine amber pinstripes
    ctx.strokeStyle = "rgba(233, 180, 87, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(canvas.width, 1);
    ctx.moveTo(0, canvasHeight - 1);
    ctx.lineTo(canvas.width, canvasHeight - 1);
    ctx.stroke();

    // Sprocket holes along top and bottom
    const totalSprockets = Math.floor(canvas.width / sprocketPitch);
    for (let i = 0; i < totalSprockets; i++) {
      const sx = i * sprocketPitch + 12;

      // Top sprocket
      ctx.fillStyle = "#050608";
      ctx.beginPath();
      ctx.roundRect(sx, (railHeight - sprocketH) / 2, sprocketW, sprocketH, sprocketRadius);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bottom sprocket
      ctx.fillStyle = "#050608";
      ctx.beginPath();
      ctx.roundRect(
        sx,
        canvasHeight - railHeight + (railHeight - sprocketH) / 2,
        sprocketW,
        sprocketH,
        sprocketRadius,
      );
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Film edge typography
    ctx.font = "600 9px monospace";
    ctx.fillStyle = "rgba(233, 180, 87, 0.75)";
    ctx.textBaseline = "middle";

    for (let f = 0; f < totalFrames; f++) {
      const fx = f * frameWidth;
      // Top rail text
      ctx.fillText("KODAK VISION3 500T 5219", fx + 36, railHeight / 2);
      ctx.fillText(`• • • 14 285${f + 1} • • •`, fx + 260, railHeight / 2);
      ctx.fillText("EASTMAN 35MM", fx + 460, railHeight / 2);

      // Bottom rail text
      ctx.fillText(HERO_FRAME_URLS[f].label, fx + 36, canvasHeight - railHeight / 2);
      ctx.fillText(HERO_FRAME_URLS[f].tag, fx + 360, canvasHeight - railHeight / 2);

      // Frame separator border line
      ctx.strokeStyle = "rgba(233, 180, 87, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, railHeight);
      ctx.lineTo(fx, canvasHeight - railHeight);
      ctx.stroke();
    }
  }

  // Pre-render placeholders immediately
  for (let f = 0; f < totalFrames; f++) {
    const fx = f * frameWidth;
    const grad = ctx.createLinearGradient(fx, railHeight, fx + frameWidth, canvasHeight - railHeight);
    grad.addColorStop(0, "#16181D");
    grad.addColorStop(0.5, "#20242B");
    grad.addColorStop(1, "#14161B");
    ctx.fillStyle = grad;
    ctx.fillRect(fx + 6, railHeight, frameWidth - 12, imgHeight);
  }
  drawPerforationsAndBorders();

  // Asynchronously load real images and stamp into atlas
  let isDisposed = false;
  const imageElements: HTMLImageElement[] = [];

  HERO_FRAME_URLS.forEach((item, index) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = item.url;
    img.onload = () => {
      if (isDisposed || !ctx) return;
      const fx = index * frameWidth;
      // Draw image to fill frame area
      ctx.drawImage(img, fx + 6, railHeight, frameWidth - 12, imgHeight);

      // Subtle vignette overlay over photo
      const vignette = ctx.createLinearGradient(fx, railHeight, fx + frameWidth, railHeight);
      vignette.addColorStop(0, "rgba(10, 12, 16, 0.45)");
      vignette.addColorStop(0.08, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.92, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(10, 12, 16, 0.45)");
      ctx.fillStyle = vignette;
      ctx.fillRect(fx + 6, railHeight, frameWidth - 12, imgHeight);

      // Redraw perforated rails over photos to keep borders crisp
      drawPerforationsAndBorders();
      onUpdate();
    };
    imageElements.push(img);
  });

  return {
    canvas,
    dispose: () => {
      isDisposed = true;
      imageElements.forEach((img) => {
        img.onload = null;
        img.src = "";
      });
    },
  };
}

export const FilmSculptureCanvas: React.FC<FilmSculptureCanvasProps> = ({ className }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasMountRef = React.useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = React.useState<boolean | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isReducedMotionActive, setIsReducedMotionActive] = React.useState(false);

  // External controller ref to communicate with render loop
  const controllerRef = React.useRef<{
    togglePause: () => void;
    setPaused: (p: boolean) => void;
  } | null>(null);

  React.useEffect(() => {
    const supported = isWebGLAvailable();
    setWebglSupported(supported);
    if (!supported || !containerRef.current || !canvasMountRef.current) return;

    const container = containerRef.current;
    const canvasMount = canvasMountRef.current;
    let isDisposed = false;

    // Detect reduced motion
    const mediaQueryMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = mediaQueryMotion.matches;
    setIsReducedMotionActive(prefersReducedMotion);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
      setIsReducedMotionActive(prefersReducedMotion);
      if (prefersReducedMotion) {
        pausedRef = true;
        setIsPaused(true);
      }
    };
    mediaQueryMotion.addEventListener("change", handleMotionChange);

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();

    const initialW = Math.max(container.clientWidth, 320);
    const initialH = Math.max(container.clientHeight, 320);

    const camera = new THREE.PerspectiveCamera(38, initialW / initialH, 0.1, 50);
    camera.position.set(0.2, 0.15, 5.8);
    camera.lookAt(0.3, 0.15, 0);

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

    const isMobileDevice =
      window.innerWidth < 640 || window.matchMedia("(pointer: coarse), (hover: none)").matches;
    renderer.setSize(initialW, initialH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobileDevice ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvasDom = renderer.domElement;
    canvasDom.setAttribute("data-testid", "film-ribbon-webgl-canvas");
    canvasDom.style.width = "100%";
    canvasDom.style.height = "100%";
    canvasDom.style.display = "block";
    canvasDom.style.outline = "none";
    canvasDom.style.touchAction = "pan-y";
    canvasMount.appendChild(canvasDom);

    // 2. Studio Lighting (Soft neutral studio key + warm amber rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.82);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ec, 1.45);
    keyLight.position.set(2.8, 3.2, 4.0);
    scene.add(keyLight);

    // Warm amber rim light highlighting the ribbon's S-curve edges
    const warmRimLight = new THREE.DirectionalLight(0xe9b457, 2.5);
    warmRimLight.position.set(3.6, 1.4, -2.2);
    scene.add(warmRimLight);

    // Subtle cool fill light
    const coolFillLight = new THREE.DirectionalLight(0x8a9bb5, 0.38);
    coolFillLight.position.set(-3.2, -1.8, 2.0);
    scene.add(coolFillLight);

    // 3. Texture Atlas & Filmstrip Material
    let filmTexture: THREE.CanvasTexture | null = null;
    const { canvas: filmCanvas, dispose: disposeFilmstrip } = createFilmstripCanvas(() => {
      if (filmTexture && !isDisposed) {
        filmTexture.needsUpdate = true;
      }
    });

    filmTexture = new THREE.CanvasTexture(filmCanvas);
    filmTexture.colorSpace = THREE.SRGBColorSpace;
    filmTexture.wrapS = THREE.RepeatWrapping;
    filmTexture.wrapT = THREE.ClampToEdgeWrapping;
    filmTexture.generateMipmaps = true;
    filmTexture.minFilter = THREE.LinearMipmapLinearFilter;
    filmTexture.magFilter = THREE.LinearFilter;

    // Subdivided Ribbon Geometry
    const ribbonGeo = createRibbonGeometry();

    // Shader Uniforms for wave & pointer response
    const shaderUniforms = {
      uTime: { value: 0 },
      uWaveAmp: { value: 1.0 },
      uPointerPos: { value: new THREE.Vector3(0.55, 0.05, 0.75) },
      uPointerStrength: { value: 0.0 },
      uPointerRadius: { value: 1.65 },
    };

    const ribbonMat = new THREE.MeshStandardMaterial({
      map: filmTexture,
      roughness: 0.32,
      metalness: 0.16,
      side: THREE.DoubleSide,
    });

    ribbonMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = shaderUniforms.uTime;
      shader.uniforms.uWaveAmp = shaderUniforms.uWaveAmp;
      shader.uniforms.uPointerPos = shaderUniforms.uPointerPos;
      shader.uniforms.uPointerStrength = shaderUniforms.uPointerStrength;
      shader.uniforms.uPointerRadius = shaderUniforms.uPointerRadius;

      shader.vertexShader = `
        uniform float uTime;
        uniform float uWaveAmp;
        uniform vec3 uPointerPos;
        uniform float uPointerStrength;
        uniform float uPointerRadius;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        // Ambient travelling wave along the ribbon length
        float wavePhase = uv.x * 6.28318 - uTime * 1.15;
        float travelingWave = (sin(wavePhase) * 0.075 + cos(uv.x * 12.566 - uTime * 1.85) * 0.032) * uWaveAmp;
        transformed += normal * travelingWave;

        // Localized pointer Gaussian depression / tactile depth response
        float distToPointer = length(transformed.xy - uPointerPos.xy);
        float influence = smoothstep(uPointerRadius, 0.0, distToPointer) * uPointerStrength;
        float depthResponse = (exp(-pow(distToPointer / 0.85, 2.0)) * 0.40 - sin(distToPointer * 5.2 - uTime * 3.2) * 0.12 * exp(-distToPointer * 1.1)) * influence;
        transformed += normal * depthResponse;
        `
      );
    };

    const compositionGroup = new THREE.Group();
    scene.add(compositionGroup);

    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    compositionGroup.add(ribbonMesh);

    // Initial render
    renderer.render(scene, camera);
    setIsReady(true);

    // 4. Pointer Interaction & Dragging State
    const raycaster = new THREE.Raycaster();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.5);
    const planeIntersection = new THREE.Vector3();
    const pointerNormalized = new THREE.Vector2(-10, -10);

    const targetPointerPos = new THREE.Vector3(0.55, 0.05, 0.75);
    let targetPointerStrength = 0.0;

    let isDragging = false;
    let dragStartX = 0;
    let dragLastX = 0;
    let dragVelocity = 0;
    let pausedRef = prefersReducedMotion;

    const AMBIENT_DRIFT_SPEED = 0.032; // Normal slow film travel

    const updatePointerWorldPosition = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      pointerNormalized.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNormalized.y = -(((clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(pointerNormalized, camera);
      const hits = raycaster.intersectObject(ribbonMesh);

      if (hits.length > 0) {
        targetPointerPos.copy(hits[0].point);
        targetPointerStrength = 1.0;
      } else {
        raycaster.ray.intersectPlane(interactionPlane, planeIntersection);
        if (planeIntersection) {
          targetPointerPos.copy(planeIntersection);
        }
        targetPointerStrength = 0.35;
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragLastX = e.clientX;
      dragVelocity = 0;
      updatePointerWorldPosition(e.clientX, e.clientY);
      startRenderLoop();
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointerWorldPosition(e.clientX, e.clientY);

      if (isDragging) {
        const deltaX = e.clientX - dragLastX;
        dragLastX = e.clientX;

        // Horizontal scrub: move texture forward or backward
        if (filmTexture) {
          const scrubFactor = 0.0016;
          filmTexture.offset.x -= deltaX * scrubFactor;
          dragVelocity = -deltaX * scrubFactor * 60; // normalized per second
        }
      }
      startRenderLoop();
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const handlePointerCancel = () => {
      isDragging = false;
      targetPointerStrength = 0.0;
    };

    const handlePointerLeave = () => {
      targetPointerStrength = 0.0;
      isDragging = false;
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointercancel", handlePointerCancel);
    container.addEventListener("pointerleave", handlePointerLeave);

    // Expose controller for pause/resume button
    controllerRef.current = {
      togglePause: () => {
        pausedRef = !pausedRef;
        setIsPaused(pausedRef);
        startRenderLoop();
      },
      setPaused: (p: boolean) => {
        pausedRef = p;
        setIsPaused(p);
        startRenderLoop();
      },
    };

    // 5. Responsive Resize Handling
    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;

      if (w < 550) {
        camera.position.z = 7.1;
        camera.position.x = 0.12;
      } else if (w < 950) {
        camera.position.z = 6.4;
        camera.position.x = 0.18;
      } else {
        camera.position.z = 5.8;
        camera.position.x = 0.2;
      }

      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      startRenderLoop();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 6. Intersection Observer (Pause when offscreen)
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

    // 7. Page Visibility Handling (Pause when tab is hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isIntersecting) {
        lastFrameTime = performance.now();
        startRenderLoop();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 8. Continuous Render Loop with Damped Delta-Time
    let rafId = 0;
    let isLoopRunning = false;
    let lastFrameTime = performance.now();
    let entranceTime = 0;
    const ENTRANCE_DURATION = 1.8;

    function tick() {
      if (isDisposed || !isIntersecting || document.visibilityState === "hidden") {
        isLoopRunning = false;
        return;
      }

      const now = performance.now();
      // Cap delta time to 100ms to eliminate jumping on background wake
      const deltaSec = Math.min((now - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now;

      // A) Entrance Progression
      if (!prefersReducedMotion && entranceTime < ENTRANCE_DURATION) {
        entranceTime += deltaSec;
        const rawProgress = Math.min(entranceTime / ENTRANCE_DURATION, 1.0);
        const progress = easeOutCubic(rawProgress);

        const initialScale = 0.92;
        const currentScale = initialScale + (1.0 - initialScale) * progress;
        compositionGroup.scale.set(currentScale, currentScale, currentScale);
        compositionGroup.position.z = -0.35 * (1.0 - progress);
        compositionGroup.rotation.y = -0.16 * (1.0 - progress);
      } else {
        compositionGroup.scale.set(1.0, 1.0, 1.0);
        compositionGroup.position.z = 0;
      }

      // B) Continuous Flow & Horizontal Scrub Mechanics
      if (filmTexture && !pausedRef && !prefersReducedMotion) {
        if (!isDragging) {
          // If releasing drag with momentum, ease smoothly back into ambient speed
          if (Math.abs(dragVelocity) > 0.001) {
            filmTexture.offset.x += dragVelocity * deltaSec;
            dragVelocity = THREE.MathUtils.damp(dragVelocity, AMBIENT_DRIFT_SPEED, 2.8, deltaSec);
          } else {
            filmTexture.offset.x += AMBIENT_DRIFT_SPEED * deltaSec;
          }
        }
        shaderUniforms.uTime.value += deltaSec;
        shaderUniforms.uWaveAmp.value = THREE.MathUtils.damp(shaderUniforms.uWaveAmp.value, 1.0, 4.0, deltaSec);
      } else {
        // Paused or reduced-motion: dampen wave amplitude to gentle rest
        shaderUniforms.uWaveAmp.value = THREE.MathUtils.damp(shaderUniforms.uWaveAmp.value, 0.0, 4.0, deltaSec);
      }

      // C) Localized Pointer Deformation Damping
      shaderUniforms.uPointerPos.value.lerp(targetPointerPos, Math.min(1.0, deltaSec * 8.0));
      shaderUniforms.uPointerStrength.value = THREE.MathUtils.damp(
        shaderUniforms.uPointerStrength.value,
        pausedRef ? 0.0 : targetPointerStrength,
        5.0,
        deltaSec,
      );

      // Subtle group tilt responsive to pointer (restrained to ~2 degrees)
      if (targetPointerStrength > 0 && !prefersReducedMotion) {
        const tiltY = pointerNormalized.x * 0.038;
        const tiltX = -pointerNormalized.y * 0.028;
        compositionGroup.rotation.y = THREE.MathUtils.damp(compositionGroup.rotation.y, tiltY, 4.0, deltaSec);
        compositionGroup.rotation.x = THREE.MathUtils.damp(compositionGroup.rotation.x, tiltX, 4.0, deltaSec);
      } else {
        compositionGroup.rotation.y = THREE.MathUtils.damp(compositionGroup.rotation.y, 0, 4.0, deltaSec);
        compositionGroup.rotation.x = THREE.MathUtils.damp(compositionGroup.rotation.x, 0, 4.0, deltaSec);
      }

      renderer.render(scene, camera);

      // Ribbon continues flowing continuously while visible unless paused and deformation settled
      const isSettledWhenPaused =
        pausedRef &&
        shaderUniforms.uWaveAmp.value < 0.01 &&
        shaderUniforms.uPointerStrength.value < 0.01 &&
        Math.abs(compositionGroup.rotation.y) < 0.001;

      if (!isSettledWhenPaused) {
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

    startRenderLoop();

    // 9. Teardown & Resource Disposal
    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(rafId);

      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("pointercancel", handlePointerCancel);
      container.removeEventListener("pointerleave", handlePointerLeave);
      mediaQueryMotion.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      disposeFilmstrip();

      ribbonGeo.dispose();
      ribbonMat.dispose();
      if (filmTexture) filmTexture.dispose();

      renderer.dispose();
      if (canvasMount && canvasMount.contains(canvasDom)) {
        canvasMount.removeChild(canvasDom);
      }
    };
  }, []);

  const handleTogglePause = () => {
    controllerRef.current?.togglePause();
  };

  if (webglSupported === false) {
    return <FilmSculptureFallback className={className} />;
  }

  return (
    <div
      ref={containerRef}
      data-testid="film-ribbon-container"
      data-webgl-ready={isReady ? "true" : "initializing"}
      className={cn(
        "relative w-full h-full min-h-[340px] sm:min-h-[400px] overflow-hidden select-none touch-pan-y cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      {/* Dedicated Three.js canvas mount */}
      <div
        ref={canvasMountRef}
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity duration-300 ease-out z-10",
          isReady ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Photographic fallback layer during initial load or WebGL initialization */}
      <div
        className={cn(
          "absolute inset-0 z-0 transition-opacity duration-300 ease-out",
          isReady ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      >
        <FilmSculptureFallback />
      </div>

      {/* Studio Camera HUD Controls (Drag Indicator & Accessible Pause/Resume) */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2">
        {/* Interactive Helper Badge: "Drag to explore" - Shown only when interactive WebGL is active */}
        <div
          className={cn(
            "pointer-events-none inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#101216]/80 backdrop-blur-md text-[11px] font-mono text-muted-foreground transition-opacity duration-300 shadow-noir-sm",
            isReady && !isReducedMotionActive && !isPaused ? "opacity-90" : "opacity-0",
          )}
        >
          <MoveHorizontal className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="hidden sm:inline">Drag to explore</span>
        </div>

        {/* Accessible Discreet Motion Pause / Resume Control */}
        <button
          type="button"
          onClick={handleTogglePause}
          aria-label={isPaused ? "Resume 3D ribbon motion" : "Pause 3D ribbon motion"}
          aria-pressed={isPaused}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#101216]/80 backdrop-blur-md text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-[#16181E]/90 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-noir-sm group cursor-pointer"
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
  );
};

export default FilmSculptureCanvas;

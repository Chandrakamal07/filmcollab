import * as THREE from "three";
import { sampleSequence, SequenceSample } from "./sequence-controller";
import { createSilhouetteAtlas, SilhouetteAtlasManager } from "./silhouette-atlas";
import { createGoldenReel, ReelAssembly } from "./ReelGeometry";
import { createFilmSystem, FilmSystem } from "./FilmPath";

export interface GoldenReelController {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  reel: ReelAssembly;
  filmSystem: FilmSystem;
  atlas: SilhouetteAtlasManager;
  update: (deltaSeconds: number, isRunning: boolean, pointer: THREE.Vector2, isMobile: boolean) => void;
  seekTime: (targetSeconds: number) => void;
  dispose: () => void;
  isReady: () => boolean;
  getActiveTime: () => number;
  getSequenceSample: () => SequenceSample;
}

export function createGoldenReelScene(
  container: HTMLElement,
  onFirstRender?: () => void,
  onError?: (err: Error) => void
): GoldenReelController {
  const width = container.clientWidth || window.innerWidth || 1200;
  const height = container.clientHeight || 700;

  let disposed = false;
  let isReady = false;
  let hasReportedFirstRender = false;

  const ownedGeometries = new Set<THREE.BufferGeometry>();
  const ownedMaterials = new Set<THREE.Material>();
  const ownedTextures = new Set<THREE.Texture>();

  // 1. WebGL Renderer
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.pointerEvents = "none";
  container.appendChild(renderer.domElement);

  // 2. Scene & Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
  const baseCamPos = new THREE.Vector3(0.15, 0.0, 5.8);
  camera.position.copy(baseCamPos);
  const cameraTarget = new THREE.Vector3(0.70, -0.05, 0.0);
  camera.lookAt(cameraTarget);

  // 3. Cinematic Studio Lighting for Warm Gold Reel & Depth
  // Warm Key Light grazing from upper right across brushed gold reel
  const keyLight = new THREE.DirectionalLight("#FFE8C4", 2.2);
  keyLight.position.set(4.5, 3.8, 2.5);
  scene.add(keyLight);

  // Soft Warm Rim Light catching reel edge bevels
  const rimLight = new THREE.SpotLight("#F5D28A", 2.8, 10, Math.PI / 3, 0.6, 1.2);
  rimLight.position.set(1.2, 3.0, -1.0);
  rimLight.target.position.set(2.4, 0.45, -0.6);
  scene.add(rimLight);
  scene.add(rimLight.target);

  // Cool Deep Ambient Light for rich contrast
  const ambientLight = new THREE.AmbientLight("#0A0C10", 0.95);
  scene.add(ambientLight);

  // Warm Projector Gate Fill Light
  const gateFillLight = new THREE.PointLight("#FFE0B2", 1.4, 6.0, 1.5);
  gateFillLight.position.set(1.5, 0.6, 0.8);
  scene.add(gateFillLight);

  // 4. Silhouette Atlas & Filmstrip
  let atlas: SilhouetteAtlasManager;
  try {
    atlas = createSilhouetteAtlas();
    ownedTextures.add(atlas.texture);
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }

  // 5. Filmstrip Ribbon & Rollers System
  const filmSystem = createFilmSystem(atlas.texture);
  scene.add(filmSystem.group);

  // 6. Vintage Golden Reel Assembly
  const reel = createGoldenReel();
  reel.group.position.set(2.40, 0.48, -0.55);
  reel.group.rotation.set(0.16, -0.36, 0.06);
  scene.add(reel.group);

  const initialReelAngle = 0.45;
  reel.rotatingPart.rotation.z = initialReelAngle;

  // 7. Time & Sequence State
  let activeTime = 0.0;
  let currentSample: SequenceSample = sampleSequence(0.0);

  // Prime the initial frame alignment
  filmSystem.updateTransport(0.0);
  atlas.update(currentSample);
  isReady = true;

  const update = (
    deltaSeconds: number,
    isRunning: boolean,
    pointer: THREE.Vector2,
    isMobile: boolean
  ) => {
    if (disposed) return;

    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
    if (isRunning) {
      activeTime += dt;
    }

    // Sample deterministic sequence state
    currentSample = sampleSequence(activeTime);

    // Update 2D silhouette animation on active frame
    atlas.update(currentSample);

    // Synchronize film transport through the viewing gate
    filmSystem.updateTransport(currentSample.transportInFrames);

    // Synchronize reel rotation derived from actual travelled distance
    const filmDistance = currentSample.transportInFrames * filmSystem.framePitch;
    const reelAngle = initialReelAngle - filmDistance / reel.effectiveWindingRadius;
    reel.rotatingPart.rotation.z = reelAngle;

    // Subtle pointer parallax (restrained, does not disrupt mechanical transport)
    const parallaxX = pointer.x * (isMobile ? 0.05 : 0.16);
    const parallaxY = pointer.y * (isMobile ? 0.03 : 0.10);

    if (isMobile) {
      camera.position.set(baseCamPos.x + 0.35 + parallaxX, baseCamPos.y + 0.12 + parallaxY, 7.2);
    } else {
      camera.position.set(baseCamPos.x + parallaxX, baseCamPos.y + parallaxY, baseCamPos.z);
    }
    camera.lookAt(cameraTarget);

    renderer.render(scene, camera);

    if (isReady && !hasReportedFirstRender) {
      hasReportedFirstRender = true;
      onFirstRender?.();
    }
  };

  const seekTime = (targetSeconds: number) => {
    activeTime = targetSeconds;
    currentSample = sampleSequence(activeTime);
    atlas.update(currentSample);
    filmSystem.updateTransport(currentSample.transportInFrames);
    const filmDistance = currentSample.transportInFrames * filmSystem.framePitch;
    const reelAngle = initialReelAngle - filmDistance / reel.effectiveWindingRadius;
    reel.rotatingPart.rotation.z = reelAngle;
    renderer.render(scene, camera);
  };

  const dispose = () => {
    disposed = true;

    atlas.dispose();
    filmSystem.dispose();
    reel.dispose();

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) ownedGeometries.add(mesh.geometry);
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => ownedMaterials.add(m));
        } else if (mesh.material) {
          ownedMaterials.add(mesh.material);
        }
      }
    });

    ownedGeometries.forEach((g) => g.dispose());
    ownedGeometries.clear();

    ownedMaterials.forEach((m) => m.dispose());
    ownedMaterials.clear();

    ownedTextures.forEach((t) => t.dispose());
    ownedTextures.clear();

    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    reel,
    filmSystem,
    atlas,
    update,
    seekTime,
    dispose,
    isReady: () => isReady,
    getActiveTime: () => activeTime,
    getSequenceSample: () => currentSample,
  };
}


import * as THREE from "three";
import { sampleSequence } from "./sequence-controller";
import type { SequenceSample } from "./types";
import { createSilhouetteAtlas, type SilhouetteAtlasManager } from "./silhouette-atlas";
import { createGoldenReel, type ReelAssembly } from "./ReelGeometry";
import { createFilmSystem, type FilmSystem } from "./FilmPath";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface GoldenReelController {
  scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  reel: ReelAssembly; filmSystem: FilmSystem; atlas: SilhouetteAtlasManager;
  update: (delta: number, running: boolean, pointer: THREE.Vector2, mobile: boolean) => void;
  seekTime: (time: number) => void;
  toggleHelpers: (visible?: boolean) => boolean;
  dispose: () => void; isReady: () => boolean;
  getActiveTime: () => number; getSequenceSample: () => SequenceSample;
}
export function createGoldenReelScene(container: HTMLElement, onFirstRender?: () => void, onError?: (error: Error) => void): GoldenReelController {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth || 1200, container.clientHeight || 440);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block", pointerEvents: "none" });
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentRoom = new RoomEnvironment();
  const environmentTarget = pmrem.fromScene(environmentRoom);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.28;
  environmentRoom.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 50);
  const key = new THREE.DirectionalLight("#fff0cf", 3.2);
  key.position.set(-4, 5, 2);
  scene.add(key);
  const fill = new THREE.HemisphereLight("#e5ecff", "#49351e", 1.1);
  scene.add(fill);
  const rim = new THREE.DirectionalLight("#e9b457", 1.4);
  rim.position.set(3, 2, -4);
  scene.add(rim);

  const atlas = createSilhouetteAtlas();
  const reel = createGoldenReel();
  reel.group.position.set(-1.3, 0.8, -1.8);
  reel.group.rotation.set(0.04, -0.80, -0.08);
  scene.add(reel.group);
  reel.group.updateWorldMatrix(true, false);
  const filmSystem = createFilmSystem(atlas.texture, reel.group, reel.parameters);
  scene.add(filmSystem.group);

  const helpers = new THREE.Group();
  helpers.visible = false;
  const helperGeometry = new THREE.BufferGeometry().setFromPoints(filmSystem.samples.map(s => s.center));
  const helperMaterial = new THREE.LineBasicMaterial({ color: "#00ffbb" });
  helpers.add(new THREE.Line(helperGeometry, helperMaterial));
  scene.add(helpers);
  const envelope: THREE.Vector3[] = [];
  for (const s of filmSystem.samples) {
    envelope.push(s.center.clone().addScaledVector(s.widthAxis, s.width / 2));
    envelope.push(s.center.clone().addScaledVector(s.widthAxis, -s.width / 2));
  }
  // Full flanges, including rotation, fit inside this sampled envelope.
  for (let i = 0; i < 64; i++) {
    for (const z of [reel.parameters.flangeFrontZ + 0.10, reel.parameters.flangeRearZ - 0.10]) {
      envelope.push(new THREE.Vector3(Math.cos(i / 64 * Math.PI * 2) * reel.outerRadius,
        Math.sin(i / 64 * Math.PI * 2) * reel.outerRadius, z).applyMatrix4(reel.group.matrixWorld));
    }
  }
  let activeTime = 0;
  let sample = sampleSequence(0);
  let disposed = false;
  let reportedReady = false;
  const target = new THREE.Vector3(-0.1, -0.65, 0);
  const zeroPointer = new THREE.Vector2();
  let lastMobile = false;
  const draw = (pointer: THREE.Vector2, mobile: boolean) => {
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 440;
    const left = mobile ? 0 : width * 0.44;
    const viewWidth = width - left;
    camera.aspect = viewWidth / height;
    camera.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let distance = 0;
    for (const p of envelope) {
      distance = Math.max(distance, p.z + Math.max(
        Math.abs(p.x - target.x) / (tan * camera.aspect), Math.abs(p.y - target.y) / tan,
      ) * 1.10);
    }
    camera.position.set(target.x + pointer.x * 0.025, target.y + pointer.y * 0.025, distance);
    camera.lookAt(target.x, target.y, distance - 1);
    renderer.setViewport(0, 0, width, height);
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setViewport(left, 0, viewWidth, height);
    renderer.setScissor(left, 0, viewWidth, height);
    renderer.setScissorTest(true);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
  };
  const apply = () => {
    sample = sampleSequence(activeTime);
    atlas.update(sample);
    filmSystem.updateTransport(sample.transportInFrames);
    reel.rotatingSpool.rotation.z = 0.45 + sample.transportInFrames * filmSystem.framePitch / reel.effectiveWindingRadius;
  };
  apply();
  return {
    scene, camera, renderer, reel, filmSystem, atlas,
    update(delta, running, pointer, mobile) {
      if (disposed) return;
      lastMobile = mobile;
      if (running) activeTime += Math.min(Math.max(delta, 0), 0.05);
      apply();
      draw(pointer, mobile);
      if (!reportedReady) { reportedReady = true; onFirstRender?.(); }
    },
    seekTime(time) { activeTime = Math.max(0, time); apply(); draw(zeroPointer, lastMobile); },
    toggleHelpers(visible) { helpers.visible = visible ?? !helpers.visible; draw(zeroPointer, lastMobile); return helpers.visible; },
    dispose() {
      disposed = true;
      atlas.dispose(); filmSystem.dispose(); reel.dispose();
      environmentTarget.dispose();
      helperGeometry.dispose(); helperMaterial.dispose(); renderer.dispose();
      renderer.domElement.remove();
    },
    isReady: () => !disposed,
    getActiveTime: () => activeTime,
    getSequenceSample: () => sample,
  };
}

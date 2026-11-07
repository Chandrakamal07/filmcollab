import * as THREE from "three";
import { sampleSequence } from "./sequence-controller";
import type { SequenceSample } from "./types";
import { createSilhouetteAtlas, type SilhouetteAtlasManager } from "./silhouette-atlas";
import { createGoldenReel, type ReelAssembly } from "./ReelGeometry";
import { createFilmSystem, type FilmSystem } from "./FilmPath";
import { createCinematicAtmosphere } from "./cinematic-atmosphere";
import { placeReferenceReel, frameReferenceCamera } from "./reference-composition";
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
  // Large luminous cards produce real reflected streaks across the curved metal.
  const lightCards: THREE.Mesh[] = [];
  for (const [x, y, z, sx, sy, strength] of [[-3, 3, 3, 1.2, 7, 14], [4, 1, -2, .45, 6, 9], [0, 5, 0, 7, .5, 6]]) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), new THREE.MeshBasicMaterial({ color: new THREE.Color(strength, strength * .76, strength * .42), side: THREE.DoubleSide }));
    card.position.set(x, y, z); card.lookAt(0, 0, 0);
    environmentRoom.add(card); lightCards.push(card);
  }
  const environmentTarget = pmrem.fromScene(environmentRoom);
  for (const card of lightCards) { environmentRoom.remove(card); card.geometry.dispose(); (card.material as THREE.Material).dispose(); }
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.8;
  environmentRoom.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 50);
  const key = new THREE.DirectionalLight("#ffe1a0", 5.0);
  key.position.set(-4, 5, 2);
  scene.add(key);
  const fill = new THREE.HemisphereLight("#b8b9bd", "#231409", 0.55);
  scene.add(fill);
  const rim = new THREE.DirectionalLight("#ffb83f", 3.8);
  rim.position.set(3, 2, -4);
  scene.add(rim);

  const atlas = createSilhouetteAtlas();
  const reel = createGoldenReel();
  placeReferenceReel(reel.group);
  scene.add(reel.group);
  reel.group.updateWorldMatrix(true, false);
  const filmSystem = createFilmSystem(atlas.texture, reel.group, reel.parameters);
  scene.add(filmSystem.group);

  const atmosphere = createCinematicAtmosphere();
  scene.add(atmosphere.group);

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
  const target = new THREE.Vector3(-0.1, -1.0, 0);
  const zeroPointer = new THREE.Vector2();
  let lastMobile = false;
  const draw = (pointer: THREE.Vector2, mobile: boolean) => {
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 440;
    if (mobile) {
      camera.fov = 55; camera.zoom = 1; camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      let distance = 0;
      for (const p of envelope) distance = Math.max(distance, p.z + Math.max(
        Math.abs(p.x - target.x) / (tan * camera.aspect), Math.abs(p.y - target.y) / tan,
      ) * 1.08);
      camera.position.set(target.x, target.y, distance);
      camera.lookAt(target.x, target.y, distance - 1);
    } else {
      frameReferenceCamera(camera, width, height);
    }
    // Lock the reference angle. Pointer motion must not change composition.
    void pointer;
    renderer.setViewport(0, 0, width, height);
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.render(scene, camera);
  };
  const apply = () => {
    sample = sampleSequence(activeTime);
    atlas.update(sample);
    atmosphere.update(activeTime);
    filmSystem.updateTransport(sample.transportInFrames);
    reel.rotatingSpool.rotation.z = 0.45 + sample.transportInFrames * filmSystem.framePitch / (reel.effectiveWindingRadius * reel.group.scale.x);
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
      atlas.dispose(); filmSystem.dispose(); reel.dispose(); atmosphere.dispose();
      environmentTarget.dispose();
      helperGeometry.dispose(); helperMaterial.dispose(); renderer.dispose();
      renderer.domElement.remove();
    },
    isReady: () => !disposed,
    getActiveTime: () => activeTime,
    getSequenceSample: () => sample,
  };
}

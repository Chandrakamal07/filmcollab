import * as THREE from "three";
import { GENRES, GENRE_COUNT } from "./sequence-controller";
import type { SequenceSample } from "./types";

export const FRAME_COUNT = GENRE_COUNT;
export const FRAME_WIDTH = 768;
export const FRAME_HEIGHT = 432;
export const ATLAS_WIDTH = FRAME_WIDTH;
export const ATLAS_HEIGHT = FRAME_HEIGHT * FRAME_COUNT;
export interface SilhouetteAtlasManager {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  update: (sample: SequenceSample) => boolean;
  dispose: () => void;
}
export function createSilhouetteAtlas(): SilhouetteAtlasManager {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_WIDTH;
  canvas.height = ATLAS_HEIGHT;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Unable to create silhouette canvas");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1 / FRAME_COUNT);
  texture.offset.y = (FRAME_COUNT - 1) / FRAME_COUNT;

  const sceneCanvas = document.createElement("canvas");
  sceneCanvas.width = FRAME_WIDTH - 116;
  sceneCanvas.height = FRAME_HEIGHT - 12;
  const sceneContext = sceneCanvas.getContext("2d");
  if (!sceneContext) throw new Error("Unable to create scene rendering context");

  function renderFrame(genre: number, progress: number) {
    // Reverse row order: advancing positive transport brings the next genre
    // into the near frame without inverting the images within each tile.
    const row = THREE.MathUtils.euclideanModulo(-genre, FRAME_COUNT);
    const y = row * FRAME_HEIGHT;
    const margin = 58;
    ctx.clearRect(0, y, FRAME_WIDTH, FRAME_HEIGHT);
    ctx.fillStyle = "#14110e";
    ctx.fillRect(0, y, FRAME_WIDTH, FRAME_HEIGHT);
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin, y + 6, FRAME_WIDTH - margin * 2, FRAME_HEIGHT - 12);
    ctx.clip();
    sceneContext.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
    GENRES[genre].render(sceneContext, sceneCanvas.width, sceneCanvas.height, progress);
    ctx.filter = "sepia(0.85) saturate(0.7)";
    ctx.drawImage(sceneCanvas, margin, y + 6);
    ctx.filter = "none";
    ctx.restore();
    // Real alpha apertures along both film edges, as in the reference image.
    for (const x of [14, FRAME_WIDTH - 43]) {
      for (let j = 0; j < 8; j++) {
        ctx.clearRect(x, y + 11 + j * 53, 29, 33);
      }
    }
  }
  for (let i = 0; i < FRAME_COUNT; i++) renderFrame(i, 0);
  let previousGenre = -1;
  let previousProgress = -1;
  let previousAdvance = false;
  return {
    canvas, ctx, texture,
    update(sample) {
      if (sample.genreIndex === previousGenre && sample.advancing === previousAdvance && Math.abs(sample.sceneProgress - previousProgress) < 0.004) return false;
      previousGenre = sample.genreIndex;
      previousProgress = sample.sceneProgress;
      previousAdvance = sample.advancing;
      renderFrame(sample.genreIndex, sample.advancing ? 1 : sample.sceneProgress);
      if (sample.advancing) renderFrame(sample.nextGenreIndex, 0);
      texture.needsUpdate = true;
      return true;
    },
    dispose() { texture.dispose(); },
  };
}

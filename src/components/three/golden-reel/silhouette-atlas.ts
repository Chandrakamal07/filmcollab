import * as THREE from "three";
import { GENRES, GENRE_COUNT } from "./sequence-controller";
import { SequenceSample } from "./types";

export const FRAME_COUNT = GENRE_COUNT; // Exactly 6 frames (matches GENRE_COUNT)
export const FRAME_WIDTH = 512;
export const FRAME_HEIGHT = 288; // 16:9 widescreen ratio
export const ATLAS_WIDTH = FRAME_WIDTH * FRAME_COUNT; // 3072px
export const ATLAS_HEIGHT = FRAME_HEIGHT; // 288px

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

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Unable to create 2D canvas context for SilhouetteAtlas");
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1 / FRAME_COUNT, 1);
  texture.offset.set(0, 0);

  let lastGenre = -1;
  let lastProgress = -1;
  let lastAdvancing = false;

  // Helper to draw filmstrip perforations and dark border around a frame
  const drawFilmBorder = (x: number, y: number, w: number, h: number) => {
    // Top and bottom sprocket margins (acetate dark borders)
    const marginH = h * 0.12;
    const windowH = h - marginH * 2;
    const windowY = y + marginH;

    ctx.fillStyle = "#0A0B0E";
    // Top strip
    ctx.fillRect(x, y, w, marginH);
    // Bottom strip
    ctx.fillRect(x, windowY + windowH, w, marginH);
    // Vertical frame divider bar
    ctx.fillRect(x, y, 6, h);
    ctx.fillRect(x + w - 6, y, 6, h);

    // Sprocket perforations (cutout holes showing dark background)
    const sproketW = w * 0.045;
    const sproketH = marginH * 0.58;
    const count = 8;
    const step = w / count;

    ctx.fillStyle = "#040507";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1;

    for (let i = 0; i < count; i++) {
      const sx = x + i * step + step * 0.28;
      // Top sprocket hole
      const syTop = y + (marginH - sproketH) * 0.5;
      ctx.beginPath();
      ctx.roundRect(sx, syTop, sproketW, sproketH, 2.5);
      ctx.fill();
      ctx.stroke();

      // Bottom sprocket hole
      const syBottom = y + h - marginH + (marginH - sproketH) * 0.5;
      ctx.beginPath();
      ctx.roundRect(sx, syBottom, sproketW, sproketH, 2.5);
      ctx.fill();
      ctx.stroke();
    }
  };

  // Helper to render an individual frame into the atlas
  const renderFrame = (genreIdx: number, progress: number) => {
    const frameIndex = genreIdx % FRAME_COUNT;
    const x = frameIndex * FRAME_WIDTH;
    const y = 0;
    const w = FRAME_WIDTH;
    const h = FRAME_HEIGHT;

    const marginH = h * 0.12;
    const windowY = y + marginH;
    const windowH = h - marginH * 2;
    const windowW = w - 12;
    const windowX = x + 6;

    ctx.save();
    // Clip to film aperture window
    ctx.beginPath();
    ctx.rect(windowX, windowY, windowW, windowH);
    ctx.clip();

    ctx.translate(windowX, windowY);
    const genre = GENRES[genreIdx % GENRE_COUNT];
    genre.render(ctx, windowW, windowH, progress);
    ctx.restore();

    // Draw the surrounding dark filmstrip and sprocket holes
    drawFilmBorder(x, y, w, h);
  };

  // Initialize all 6 frames with initial resting poses
  for (let f = 0; f < FRAME_COUNT; f++) {
    renderFrame(f, 0.0);
  }
  texture.needsUpdate = true;

  const update = (sample: SequenceSample): boolean => {
    const { genreIndex, sceneProgress, advancing, nextGenreIndex } = sample;

    const progressDiff = Math.abs(sceneProgress - lastProgress);
    const genreChanged = genreIndex !== lastGenre;
    const advanceStateChanged = advancing !== lastAdvancing;

    // Throttle canvas texture re-upload if progress delta is negligible
    if (!genreChanged && !advanceStateChanged && progressDiff < 0.005) {
      return false;
    }

    lastGenre = genreIndex;
    lastProgress = sceneProgress;
    lastAdvancing = advancing;

    if (!advancing) {
      // Current frame plays its animated silhouette
      renderFrame(genreIndex, sceneProgress);
    } else {
      // Advancing: outgoing frame at settled final pose (1.0), incoming frame at initial pose (0.0)
      renderFrame(genreIndex, 1.0);
      renderFrame(nextGenreIndex, 0.0);
    }

    texture.needsUpdate = true;
    return true;
  };

  const dispose = () => {
    texture.dispose();
  };

  return {
    canvas,
    ctx,
    texture,
    update,
    dispose,
  };
}

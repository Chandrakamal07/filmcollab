import * as THREE from "three";
import { GENRES, GENRE_COUNT } from "./sequence-controller";
import { SequenceSample } from "./types";

export const FRAME_COUNT = 7; // 6 genres + 1 duplicate (Action) for seamless loop
export const FRAME_WIDTH = 512;
export const FRAME_HEIGHT = 288; // 16:9 widescreen frame
export const ATLAS_WIDTH = FRAME_WIDTH * FRAME_COUNT; // 3584
export const ATLAS_HEIGHT = FRAME_HEIGHT; // 288

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

  let lastGenre = -1;
  let lastProgress = -1;
  let lastAdvancing = false;

  // Helper to draw filmstrip perforations and dark border around a frame
  const drawFilmBorder = (x: number, y: number, w: number, h: number) => {
    // Top and bottom sprocket margins (acetate black)
    const marginH = h * 0.14;
    const windowH = h - marginH * 2;
    const windowY = y + marginH;

    ctx.fillStyle = "#0A0B0E";
    // Top strip
    ctx.fillRect(x, y, w, marginH);
    // Bottom strip
    ctx.fillRect(x, windowY + windowH, w, marginH);
    // Left/Right frame divider bar (thin frame line)
    ctx.fillRect(x, y, 6, h);
    ctx.fillRect(x + w - 6, y, 6, h);

    // Sprocket perforations (cutout holes showing dark background)
    const sproketW = w * 0.045;
    const sproketH = marginH * 0.58;
    const count = 8;
    const step = w / count;

    ctx.fillStyle = "#040507";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;

    for (let i = 0; i < count; i++) {
      const sx = x + i * step + step * 0.28;
      // Top sprocket hole
      const syTop = y + (marginH - sproketH) * 0.5;
      ctx.beginPath();
      ctx.roundRect(sx, syTop, sproketW, sproketH, 3);
      ctx.fill();
      ctx.stroke();

      // Bottom sprocket hole
      const syBottom = y + h - marginH + (marginH - sproketH) * 0.5;
      ctx.beginPath();
      ctx.roundRect(sx, syBottom, sproketW, sproketH, 3);
      ctx.fill();
      ctx.stroke();
    }
  };

  // Helper to render an individual frame into the atlas
  const renderFrame = (frameIndex: number, genreIdx: number, progress: number) => {
    const x = frameIndex * FRAME_WIDTH;
    const y = 0;
    const w = FRAME_WIDTH;
    const h = FRAME_HEIGHT;

    const marginH = h * 0.14;
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

  // Initialize all 7 frames with resting poses
  for (let f = 0; f < FRAME_COUNT; f++) {
    const gIdx = f % GENRE_COUNT;
    renderFrame(f, gIdx, 0.0);
  }
  texture.needsUpdate = true;

  const update = (sample: SequenceSample): boolean => {
    const { genreIndex, sceneProgress, advancing, nextGenreIndex } = sample;

    // Only update canvas texture if frame content has meaningfully changed
    const progressDiff = Math.abs(sceneProgress - lastProgress);
    const genreChanged = genreIndex !== lastGenre;
    const advanceStateChanged = advancing !== lastAdvancing;

    if (!genreChanged && !advanceStateChanged && progressDiff < 0.005) {
      return false;
    }

    lastGenre = genreIndex;
    lastProgress = sceneProgress;
    lastAdvancing = advancing;

    if (!advancing) {
      // Current frame plays its animation
      renderFrame(genreIndex, genreIndex, sceneProgress);
      // If active is frame 0 (Action), also duplicate to frame 6
      if (genreIndex === 0) {
        renderFrame(6, 0, sceneProgress);
      }
    } else {
      // Advancing: outgoing frame is at final pose (1.0), incoming frame is at initial pose (0.0)
      renderFrame(genreIndex, genreIndex, 1.0);
      if (genreIndex === 0) {
        renderFrame(6, 0, 1.0);
      }
      renderFrame(nextGenreIndex, nextGenreIndex, 0.0);
      if (nextGenreIndex === 0) {
        renderFrame(6, 0, 0.0);
      }
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


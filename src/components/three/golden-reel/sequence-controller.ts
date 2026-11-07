import * as THREE from "three";
import { GenreDefinition, SequenceSample } from "./types";
import { actionScene } from "./scenes/action";
import { danceScene } from "./scenes/dance";
import { chaseScene } from "./scenes/chase";
import { horrorScene } from "./scenes/horror";
import { comedyScene } from "./scenes/comedy";
import { adventureScene } from "./scenes/adventure";

export const GENRES: GenreDefinition[] = [
  danceScene,
  actionScene,
  chaseScene,
  horrorScene,
  comedyScene,
  adventureScene,
];

export const GENRE_COUNT = GENRES.length; // Exactly 6 genres
export const PLAY_SECONDS = 4.0;
export const HOLD_SECONDS = 0.3;
export const ADVANCE_SECONDS = 1.2;
export const SLOT_SECONDS = PLAY_SECONDS + HOLD_SECONDS + ADVANCE_SECONDS; // 5.5s
export const CYCLE_SECONDS = GENRE_COUNT * SLOT_SECONDS; // 33.0s

export function smootherstep(value: number): number {
  const t = Math.min(Math.max(value, 0), 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function sampleSequence(activeTime: number): SequenceSample {
  const slot = Math.floor(activeTime / SLOT_SECONDS);
  const localTime = activeTime - slot * SLOT_SECONDS;

  const genreIndex = THREE.MathUtils.euclideanModulo(slot, GENRE_COUNT);
  const nextGenreIndex = (genreIndex + 1) % GENRE_COUNT;

  const advanceStart = PLAY_SECONDS + HOLD_SECONDS;
  const advancing = localTime >= advanceStart;

  const advanceProgress = advancing
    ? smootherstep((localTime - advanceStart) / ADVANCE_SECONDS)
    : 0;

  const sceneProgress = Math.min(localTime / PLAY_SECONDS, 1.0);
  const transportInFrames = slot + advanceProgress;

  return {
    genreIndex,
    genre: GENRES[genreIndex],
    nextGenreIndex,
    nextGenre: GENRES[nextGenreIndex],
    advancing,
    sceneProgress,
    advanceProgress,
    transportInFrames,
  };
}


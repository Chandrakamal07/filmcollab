export type GenreId =
  | "action"
  | "dance"
  | "chase"
  | "horror"
  | "comedy"
  | "adventure";

export interface GenreDefinition {
  id: GenreId;
  title: string;
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => void;
}

export interface SequenceSample {
  genreIndex: number;
  genre: GenreDefinition;
  nextGenreIndex: number;
  nextGenre: GenreDefinition;
  advancing: boolean;
  sceneProgress: number;
  advanceProgress: number;
  transportInFrames: number;
}


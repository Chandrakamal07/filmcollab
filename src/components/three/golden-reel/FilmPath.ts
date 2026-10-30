import * as THREE from "three";
import { FRAME_COUNT } from "./silhouette-atlas";
import type { ReelGeometryParameters } from "./ReelGeometry";
import { buildFilmLayout, type FilmSample } from "./film-layout";

export interface FilmSystem {
  group: THREE.Group;
  filmMesh: THREE.Mesh;
  filmMaterial: THREE.MeshBasicMaterial;
  samples: FilmSample[];
  framePitch: number;
  updateTransport: (transportInFrames: number) => void;
  dispose: () => void;
}

export function createFilmSystem(texture: THREE.CanvasTexture, reel: THREE.Group, parameters: ReelGeometryParameters): FilmSystem {
  reel.updateWorldMatrix(true, false);
  const layout = buildFilmLayout(reel.matrixWorld, parameters);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  layout.samples.forEach((s, i) => {
    for (const sign of [-1, 1]) {
      const p = s.center.clone().addScaledVector(s.widthAxis, sign * s.width / 2);
      positions.push(p.x, p.y, p.z);
      uvs.push(sign < 0 ? 0 : 1, (layout.gateEndDistance - s.distance) / layout.framePitch);
    }
    if (i < layout.samples.length - 1) {
      const j = i * 2;
      indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const filmMaterial = new THREE.MeshBasicMaterial({
    map: texture, side: THREE.DoubleSide, toneMapped: false,
    transparent: true, alphaTest: 0.5,
  });
  const filmMesh = new THREE.Mesh(geometry, filmMaterial);
  const group = new THREE.Group();
  group.name = "continuousCurvedFilm";
  group.add(filmMesh);
  texture.repeat.set(1, 1 / FRAME_COUNT);
  texture.offset.set(0, (FRAME_COUNT - 1) / FRAME_COUNT);
  return {
    group, filmMesh, filmMaterial, samples: layout.samples,
    framePitch: layout.framePitch,
    updateTransport(frames) {
      texture.offset.y = THREE.MathUtils.euclideanModulo(FRAME_COUNT - 1 + frames, FRAME_COUNT) / FRAME_COUNT;
    },
    dispose() { geometry.dispose(); filmMaterial.dispose(); },
  };
}

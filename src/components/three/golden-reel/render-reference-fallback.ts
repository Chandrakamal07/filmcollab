import * as THREE from "three";
import { createGoldenReel } from "./ReelGeometry";
import { createFilmSystem } from "./FilmPath";
import { createSilhouetteAtlas } from "./silhouette-atlas";
import { placeReferenceReel, frameReferenceCamera } from "./reference-composition";

type Vertex = { x: number; y: number; z: number; u: number; v: number };
type Face = { vertices: Vertex[]; depth: number; color: string; film: boolean };
/** Static CPU projection for loading/no-WebGL. Uses the real mesh and atlas,
 * rather than a differently positioned illustration. Never runs an animation loop. */
export function renderReferenceFallback(canvas: HTMLCanvasElement, width: number, height: number) {
  const ctx = canvas.getContext("2d"); if (!ctx || !width || !height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  const camera = new THREE.PerspectiveCamera();
  const referenceHeight = Math.min(height, width * 9 / 16);
  const top = (height - referenceHeight) / 2;
  frameReferenceCamera(camera, width, referenceHeight);
  const reel = createGoldenReel(); placeReferenceReel(reel.group);
  reel.rotatingSpool.rotation.z = .45; reel.group.updateWorldMatrix(true, true);
  const atlas = createSilhouetteAtlas();
  const film = createFilmSystem(atlas.texture, reel.group, reel.parameters);
  film.group.updateWorldMatrix(true, true);
  const faces: Face[] = [];
  const light = new THREE.Vector3(-3, 5, 8).normalize();
  const addMesh = (mesh: THREE.Mesh, isFilm: boolean) => {
    const geo = mesh.geometry;
    const position = geo.getAttribute("position"), normal = geo.getAttribute("normal"), uv = geo.getAttribute("uv"), color = geo.getAttribute("color");
    if (!position) return;
    const index = geo.getIndex();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < (index?.count ?? position.count); i += 3) {
      const vertices: Vertex[] = [];
      const faceNormal = new THREE.Vector3(); let tint = 0;
      for (let k = 0; k < 3; k++) {
        const j = index ? index.getX(i + k) : i + k;
        const p = new THREE.Vector3().fromBufferAttribute(position, j).applyMatrix4(mesh.matrixWorld);
        const projected = p.clone().project(camera);
        vertices.push({ x: (projected.x + 1) * width / 2, y: top + (1 - projected.y) * referenceHeight / 2, z: camera.position.z - p.z, u: uv?.getX(j) ?? 0, v: uv?.getY(j) ?? 0 });
        if (normal) faceNormal.add(new THREE.Vector3().fromBufferAttribute(normal, j).applyMatrix3(normalMatrix).normalize());
        tint += color ? color.getX(j) / 3 : 1 / 3;
      }
      if (vertices.some(p => p.z <= .1)) continue;
      const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      const base = material.color?.clone() ?? new THREE.Color("#aa7a35");
      const shade = isFilm ? tint : .25 + .75 * Math.abs(faceNormal.normalize().dot(light));
      base.multiplyScalar(shade);
      faces.push({ vertices, depth: vertices.reduce((n, v) => n + v.z / 3, 0), color: base.getStyle(), film: isFilm });
    }
  };
  reel.group.traverse(o => { if (o instanceof THREE.Mesh) addMesh(o, false); });
  // Canvas2D interpolation is affine; subdivide across the width to emulate
  // the GPU's perspective-correct texture interpolation at the near edge.
  const filmPositions: number[] = [], filmUvs: number[] = [], filmColors: number[] = [], filmIndices: number[] = [];
  const columns = 16;
  const total = film.samples[film.samples.length - 1].distance;
  film.samples.forEach((s, i) => {
    const brightness = THREE.MathUtils.lerp(.035, 1, 1 - THREE.MathUtils.smoothstep((total - s.distance) / film.framePitch, 2.9, 3.45));
    for (let j = 0; j <= columns; j++) {
      const p = s.center.clone().addScaledVector(s.widthAxis, (j / columns - .5) * s.width);
      filmPositions.push(p.x, p.y, p.z); filmUvs.push(j / columns, (total - s.distance) / film.framePitch);
      filmColors.push(brightness, brightness, brightness);
      if (i < film.samples.length - 1 && j < columns) {
        const a = i * (columns + 1) + j, b = a + columns + 1;
        filmIndices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  });
  const projectedFilmGeometry = new THREE.BufferGeometry();
  projectedFilmGeometry.setAttribute("position", new THREE.Float32BufferAttribute(filmPositions, 3));
  projectedFilmGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(filmUvs, 2));
  projectedFilmGeometry.setAttribute("color", new THREE.Float32BufferAttribute(filmColors, 3));
  projectedFilmGeometry.setIndex(filmIndices);
  const projectedFilm = new THREE.Mesh(projectedFilmGeometry, film.filmMaterial);
  addMesh(projectedFilm, true);
  // Repeat the canvas vertically so triangles crossing the six-frame seam
  // interpolate continuously instead of stretching across the full atlas.
  const repeated = document.createElement("canvas"); repeated.width = atlas.canvas.width; repeated.height = atlas.canvas.height * 3;
  const repeatedContext = repeated.getContext("2d")!;
  for (let i = 0; i < 3; i++) repeatedContext.drawImage(atlas.canvas, 0, i * atlas.canvas.height);
  faces.sort((a, b) => b.depth - a.depth);
  for (const face of faces) {
    const [a, b, c] = face.vertices;
    const centerX = (a.x + b.x + c.x) / 3, centerY = (a.y + b.y + c.y) / 3;
    const clipPoint = (v: Vertex) => {
      const dx = v.x - centerX, dy = v.y - centerY;
      const factor = face.film ? .55 / Math.max(.01, Math.hypot(dx, dy)) : 0;
      return { x: v.x + dx * factor, y: v.y + dy * factor };
    };
    const aa = clipPoint(a), bb = clipPoint(b), cc = clipPoint(c);
    ctx.save(); ctx.beginPath(); ctx.moveTo(aa.x, aa.y); ctx.lineTo(bb.x, bb.y); ctx.lineTo(cc.x, cc.y); ctx.closePath();
    if (face.film) {
      ctx.clip();
      const raw = face.vertices.map(v => 1 - (v.v / 6 + 5 / 6));
      const shift = 1 - Math.floor(Math.min(...raw));
      const source = face.vertices.map((v, i) => ({ x: v.u * atlas.canvas.width, y: (raw[i] + shift) * atlas.canvas.height }));
      const [p, q, r] = source;
      const det = p.x * (q.y - r.y) + q.x * (r.y - p.y) + r.x * (p.y - q.y);
      if (Math.abs(det) > 1e-7) {
        const solve = (v1: number, v2: number, v3: number) => [
          (v1 * (q.y - r.y) + v2 * (r.y - p.y) + v3 * (p.y - q.y)) / det,
          (v1 * (r.x - q.x) + v2 * (p.x - r.x) + v3 * (q.x - p.x)) / det,
          (v1 * (q.x * r.y - r.x * q.y) + v2 * (r.x * p.y - p.x * r.y) + v3 * (p.x * q.y - q.x * p.y)) / det,
        ];
        const x = solve(a.x, b.x, c.x), y = solve(a.y, b.y, c.y);
        ctx.transform(x[0], y[0], x[1], y[1], x[2], y[2]);
        ctx.globalAlpha = new THREE.Color(face.color).r;
        ctx.drawImage(repeated, 0, 0);
      }
    } else { ctx.fillStyle = face.color; ctx.strokeStyle = face.color; ctx.lineWidth = .45; ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  projectedFilmGeometry.dispose(); atlas.dispose(); film.dispose(); reel.dispose();
}

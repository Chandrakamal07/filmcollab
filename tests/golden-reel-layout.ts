import * as THREE from "three";
import assert from "node:assert/strict";
import { createGoldenReel } from "../src/components/three/golden-reel/ReelGeometry";
import { buildFilmLayout } from "../src/components/three/golden-reel/film-layout";
import { createFilmSystem } from "../src/components/three/golden-reel/FilmPath";
import { sampleSequence } from "../src/components/three/golden-reel/sequence-controller";

const reel = createGoldenReel();
reel.group.position.set(-1.3, 0.8, -1.8);
reel.group.rotation.set(0.04, -1.05, -0.08);
reel.group.updateWorldMatrix(true, false);
const layout = buildFilmLayout(reel.group.matrixWorld, reel.parameters);
const inverse = reel.group.matrixWorld.clone().invert();
let collisions = 0;
let foldedEdges = 0;
for (let i = 0; i < layout.samples.length; i++) {
  const s = layout.samples[i];
  assert.ok(Math.abs(s.width - reel.parameters.filmPackWidth) < 1e-10);
  assert.ok(Math.abs(s.tangent.dot(s.widthAxis)) < 1e-10);
  for (let j = 0; j <= 20; j++) {
    const p = s.center.clone().addScaledVector(s.widthAxis, s.width * (j / 20 - 0.5)).applyMatrix4(inverse);
    if (Math.hypot(p.x, p.y) <= reel.outerRadius + 0.02) {
      const margin = Math.max(reel.parameters.flangeFrontZ - Math.abs(p.z), Math.abs(p.z) - reel.parameters.flangeFrontZ - 0.032);
      if (margin < -1e-4) collisions++;
    }
  }
  if (i) {
    const previous = layout.samples[i - 1];
    for (const sign of [-1, 1]) {
      const a = previous.center.clone().addScaledVector(previous.widthAxis, sign * previous.width / 2);
      const b = s.center.clone().addScaledVector(s.widthAxis, sign * s.width / 2);
      if (b.sub(a).dot(s.tangent) < -1e-6) foldedEdges++;
    }
  }
}
assert.equal(collisions, 0, "Complete strip must clear both flange faces");
assert.equal(foldedEdges, 0, "Ribbon edges must not reverse through a bend");
const texture = new THREE.CanvasTexture({} as HTMLCanvasElement);
const film = createFilmSystem(texture, reel.group, reel.parameters);
for (const frames of [0, 0.5, 1, 6, 12, 123.75]) {
  film.updateTransport(frames);
  assert.ok(Math.abs(texture.offset.y - THREE.MathUtils.euclideanModulo(5 + frames, 6) / 6) < 1e-10);
}
assert.equal(sampleSequence(0).genre.id, "dance");
assert.equal(sampleSequence(5.5).genre.id, "action");
assert.equal(sampleSequence(33).genre.id, "dance");
const first = layout.samples[0].center;
const last = layout.samples[layout.samples.length - 1].center;
assert.ok(last.z - first.z > 4, "Foreground must come toward the viewer");
assert.ok(last.x < 1.2, "Foreground must sweep diagonally left from the crest");
console.log(JSON.stringify({ samples: layout.samples.length, constantWidth: reel.parameters.filmPackWidth, collisions, foldedEdges, firstGenre: sampleSequence(0).genre.id, secondGenre: sampleSequence(5.5).genre.id }, null, 2));
film.dispose(); texture.dispose(); reel.dispose();

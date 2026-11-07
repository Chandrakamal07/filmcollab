import * as THREE from "three";
import assert from "node:assert/strict";
import { createGoldenReel } from "../src/components/three/golden-reel/ReelGeometry";
import { buildFilmLayout } from "../src/components/three/golden-reel/film-layout";
import { createFilmSystem } from "../src/components/three/golden-reel/FilmPath";
import { placeReferenceReel, frameReferenceCamera, REFERENCE_COMPOSITION } from "../src/components/three/golden-reel/reference-composition";
import { sampleSequence } from "../src/components/three/golden-reel/sequence-controller";

const reel = createGoldenReel();
placeReferenceReel(reel.group);
reel.group.updateWorldMatrix(true, false);
const layout = buildFilmLayout(reel.group.matrixWorld, reel.parameters);
const inverse = reel.group.matrixWorld.clone().invert();
let collisions = 0;
let foldedEdges = 0;
for (let i = 0; i < layout.samples.length; i++) {
  const s = layout.samples[i];
  assert.ok(Math.abs(s.width - reel.parameters.filmPackWidth * reel.group.scale.x) < 1e-10);
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
const camera = new THREE.PerspectiveCamera();
frameReferenceCamera(camera, 1672, 941);
const project = (p: THREE.Vector3) => {
  const q = p.clone().project(camera);
  return { x: (q.x + 1) / 2, y: (1 - q.y) / 2 };
};
const reelCenter = project(reel.group.position);
const crest = project(new THREE.Vector3(2.4, 1.45, 6));
assert.ok(Math.abs(reelCenter.x - .473) < .035, "Reel sits behind the middle of the hero");
assert.ok(Math.abs(reelCenter.y - .363) < .04, "Reel vertical position matches reference");
assert.ok(Math.abs(crest.x - .753) < .04 && Math.abs(crest.y - .228) < .04, "Film crest matches the reference angle and position");
assert.ok(project(last).y > .92, "Foreground strip reaches the lower edge without dominating the composition");
const rimPoints = Array.from({length: 128}, (_, i) => project(new THREE.Vector3(Math.cos(i / 128 * Math.PI * 2) * reel.outerRadius, Math.sin(i / 128 * Math.PI * 2) * reel.outerRadius, .525).applyMatrix4(reel.group.matrixWorld)));
const reelBounds = { left: Math.min(...rimPoints.map(p => p.x)), right: Math.max(...rimPoints.map(p => p.x)), top: Math.min(...rimPoints.map(p => p.y)), bottom: Math.max(...rimPoints.map(p => p.y)) };
assert.ok(reelBounds.bottom - reelBounds.top > .47 && reelBounds.bottom - reelBounds.top < .52, "Reel occupies the reference's large vertical footprint");
assert.ok(reelBounds.right - reelBounds.left > .13 && reelBounds.right - reelBounds.left < .20, "Reel shaft angle yields the reference's narrow ellipse");
// A camera-only scale change must preserve the complete world-space mechanism.
const baselineCamera = camera.clone();
baselineCamera.zoom /= REFERENCE_COMPOSITION.presentationScale;
baselineCamera.updateProjectionMatrix();
for (const point of [reel.group.position, new THREE.Vector3(2.4, 1.45, 6), last]) {
  const before = point.clone().project(baselineCamera);
  const after = point.clone().project(camera);
  assert.ok(Math.abs(after.x - before.x * .82) < 1e-10);
  assert.ok(Math.abs(after.y - before.y * .82) < 1e-10);
}
assert.equal(reel.group.scale.x, 1.45, "Mechanical scale stays unchanged");
console.log(JSON.stringify({ presentationScale: REFERENCE_COMPOSITION.presentationScale, reelBounds, referenceAnchors: { reelCenter, crest, foreground: project(last) }, samples: layout.samples.length, constantWidth: layout.samples[0].width, collisions, foldedEdges, firstGenre: sampleSequence(0).genre.id, secondGenre: sampleSequence(5.5).genre.id }, null, 2));
film.dispose(); texture.dispose(); reel.dispose();

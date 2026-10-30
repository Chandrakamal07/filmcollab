import * as THREE from "three";
import assert from "node:assert/strict";
import { buildFilmLayout } from "../src/components/three/golden-reel/film-layout";
import { createGoldenReel } from "../src/components/three/golden-reel/ReelGeometry";
import { createFilmSystem } from "../src/components/three/golden-reel/FilmPath";

const reel = createGoldenReel();
reel.group.position.set(2.4, 0.48, -0.55);
reel.group.rotation.set(0.16, -0.36, 0.06);
reel.group.updateWorldMatrix(true, false);
const layout = buildFilmLayout(reel.group.matrixWorld, reel.parameters);
const inverse = reel.group.matrixWorld.clone().invert();
let minimumMargin = Infinity;
let maximumOrthogonalityError = 0;
const crossings: unknown[] = [];
for (const sample of layout.samples) {
  maximumOrthogonalityError = Math.max(maximumOrthogonalityError, Math.abs(sample.tangent.dot(sample.widthAxis)));
  assert.ok(Number.isFinite(sample.distance));
  // Check the whole cross-section, not just its center point.
  for (let i = 0; i <= 20; i++) {
    const p = sample.center.clone().addScaledVector(sample.widthAxis, sample.width * (i / 20 - 0.5)).applyMatrix4(inverse);
    const radius = Math.hypot(p.x, p.y);
    const flangeThickness = 0.032;
    const clearance = Math.abs(p.z) - (reel.parameters.flangeFrontZ + flangeThickness);
    if (radius <= reel.outerRadius + 0.02) {
      // Between the flanges is safe; outside their outer faces is safe.
      const insideMargin = reel.parameters.flangeFrontZ - Math.abs(p.z);
      const margin = Math.max(insideMargin, clearance);
      minimumMargin = Math.min(minimumMargin, margin);
      if (margin < -1e-4) crossings.push({ section: sample.section, radius, z: p.z });
    }
  }
}
assert.ok(maximumOrthogonalityError < 1e-10);
const gate = layout.samples.filter(s => s.section === "gate");
for (const s of layout.samples) {
  if (["display-transition", "outgoing-transition", "clearance", "upper-contact", "lower-contact"].includes(s.section)) {
    assert.ok(Math.abs(s.width - reel.parameters.filmPackWidth) < 1e-10,
      "Bending sections must remain narrow to avoid folded side wings");
  }
  if (s.section === "straight-expansion" || s.section === "straight-contraction") {
    assert.ok(Math.abs(s.center.y - 0.05) < 1e-10);
    assert.ok(Math.abs(s.center.z - 0.65) < 1e-10);
    assert.ok(s.widthAxis.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-10);
  }
}
for (const s of gate) {
  assert.ok(Math.abs(s.center.y - 0.05) < 1e-10);
  assert.ok(Math.abs(s.center.z - 0.65) < 1e-10);
  assert.ok(Math.abs(s.width - 1.0125) < 1e-10);
}
assert.ok(Math.abs(layout.gateEndDistance - layout.gateStartDistance - layout.framePitch) < 1e-10);
const localDeparture = layout.departure.clone().applyMatrix4(inverse);
const radial = new THREE.Vector3(localDeparture.x, localDeparture.y, 0).normalize().transformDirection(reel.group.matrixWorld);
assert.ok(Math.abs(radial.dot(layout.departureTangent)) < 1e-10);
for (const [index, name] of ["upper-contact", "lower-contact"].entries()) {
  const roller = layout.rollers[index];
  for (const s of layout.samples.filter(s => s.section === name)) {
    const r = s.center.clone().sub(roller.center);
    assert.ok(Math.abs(r.length() - roller.radius) < 1e-10);
    assert.ok(Math.abs(r.dot(roller.axis)) < 1e-10);
    assert.ok(Math.abs(r.dot(s.tangent)) < 1e-10);
  }
}
console.log(JSON.stringify({ samples: layout.samples.length, maximumOrthogonalityError, minimumMargin, crossings: crossings.slice(0, 5), crossingCount: crossings.length }, null, 2));
assert.equal(crossings.length, 0);
const texture = new THREE.CanvasTexture({} as HTMLCanvasElement);
const film = createFilmSystem(texture, reel.group, reel.parameters);
const upperAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(film.upperRoller.quaternion);
const lowerAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(film.lowerRoller.quaternion);
for (const frames of [0, 0.5, 1, 6, 12, 123.75]) {
  film.updateTransport(frames);
  assert.ok(upperAxis.distanceTo(new THREE.Vector3(0, 1, 0).applyQuaternion(film.upperRoller.quaternion)) < 1e-10);
  assert.ok(lowerAxis.distanceTo(new THREE.Vector3(0, 1, 0).applyQuaternion(film.lowerRoller.quaternion)) < 1e-10);
  assert.ok(Math.abs(texture.offset.x - THREE.MathUtils.euclideanModulo(frames, 6) / 6) < 1e-10);
}
film.dispose();
texture.dispose();
reel.dispose();


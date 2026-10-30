import * as THREE from "three";
import type { ReelGeometryParameters } from "./ReelGeometry";

export interface FilmSample {
  center: THREE.Vector3;
  tangent: THREE.Vector3;
  widthAxis: THREE.Vector3;
  width: number;
  distance: number;
  section: string;
}
export interface FilmLayout {
  samples: FilmSample[];
  framePitch: number;
  gateEndDistance: number;
  departure: THREE.Vector3;
  departureTangent: THREE.Vector3;
}

/** A single constant-width strip: rear spool, low return curl, high crest,
 * then a diagonal sweep toward the viewer. No independent display panel. */
export function buildFilmLayout(matrix: THREE.Matrix4, parameters: ReelGeometryParameters): FilmLayout {
  const samples: FilmSample[] = [];
  const width = parameters.filmPackWidth;
  const shaft = new THREE.Vector3(0, 0, 1).transformDirection(matrix);
  const departure = new THREE.Vector3(0, -parameters.windingRadius, 0).applyMatrix4(matrix);
  const departureTangent = new THREE.Vector3(1, 0, 0).transformDirection(matrix);
  let distance = 0;
  const add = (center: THREE.Vector3, tangent: THREE.Vector3, axis: THREE.Vector3, section: string) => {
    const previous = samples[samples.length - 1];
    if (previous && previous.center.distanceToSquared(center) < 1e-16) return;
    if (previous) distance += previous.center.distanceTo(center);
    const t = tangent.clone().normalize();
    const w = axis.clone().addScaledVector(t, -axis.dot(t)).normalize();
    samples.push({ center: center.clone(), tangent: t, widthAxis: w, width, distance, section });
  };
  // The first span stays in the winding midplane until it clears both flanges.
  const clear = departure.clone().addScaledVector(departureTangent, 1.85);
  for (let i = 0; i <= 60; i++) add(departure.clone().lerp(clear, i / 60), departureTangent, shaft, "spool-span");
  const curves = [
    new THREE.CubicBezierCurve3(clear, clear.clone().addScaledVector(departureTangent, 1.2),
      new THREE.Vector3(1.6, -0.8, 0.5), new THREE.Vector3(1.7, 0.2, -0.5)),
    new THREE.CubicBezierCurve3(new THREE.Vector3(1.7, 0.2, -0.5),
      new THREE.Vector3(1.765, 0.85, -1.15), new THREE.Vector3(1.20, 1.65, -1.25), new THREE.Vector3(1.20, 1.65, -0.30)),
    new THREE.CubicBezierCurve3(new THREE.Vector3(1.20, 1.65, -0.30),
      new THREE.Vector3(1.20, 1.65, 0.65), new THREE.Vector3(0.55, -0.75, 3.60), new THREE.Vector3(-0.30, -1.80, 4.50)),
  ];
  const tangents: THREE.Vector3[] = [];
  const points: THREE.Vector3[] = [];
  const transported: THREE.Vector3[] = [];
  let axis = shaft.clone();
  let previousTangent = departureTangent.clone();
  const turn = new THREE.Quaternion();
  for (const curve of curves) {
    for (let i = 0; i <= 120; i++) {
      if (i === 0 && points.length) continue;
      const tangent = curve.getTangent(i / 120).normalize();
      turn.setFromUnitVectors(previousTangent, tangent);
      axis = axis.clone().applyQuaternion(turn).normalize();
      points.push(curve.getPoint(i / 120));
      tangents.push(tangent);
      transported.push(axis.clone());
      previousTangent = tangent;
    }
  }
  // Distribute the twist over the return curl. The foreground width remains
  // consistently left-to-right, so characters stay upright in each film cell.
  const foregroundStart = 240;
  const t = tangents[foregroundStart];
  const target = new THREE.Vector3(1, 0, 0).addScaledVector(t, -t.x).normalize();
  const original = transported[foregroundStart];
  const twist = Math.atan2(new THREE.Vector3().crossVectors(original, target).dot(t), original.dot(target));
  for (let i = 0; i < points.length; i++) {
    const fraction = Math.min(i / foregroundStart, 1);
    const blend = fraction * fraction * (3 - 2 * fraction);
    const widthAxis = i >= foregroundStart
      ? new THREE.Vector3(1, 0, 0).addScaledVector(tangents[i], -tangents[i].x).normalize()
      : transported[i].clone().applyAxisAngle(tangents[i], twist * blend);
    add(points[i], tangents[i], widthAxis, i >= foregroundStart ? "foreground" : "return-curl");
  }
  return {
    samples, framePitch: width * 432 / 768,
    gateEndDistance: distance, departure, departureTangent,
  };
}

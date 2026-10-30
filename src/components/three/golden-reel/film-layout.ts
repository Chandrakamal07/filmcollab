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
  gateStartDistance: number;
  gateEndDistance: number;
  departure: THREE.Vector3;
  departureTangent: THREE.Vector3;
  rollers: {
    center: THREE.Vector3; axis: THREE.Vector3;
    radius: number; width: number; spinSign: number;
  }[];
}

const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Shared, sampled geometry for the complete strip; no independent guessed contact points.
 * Coordinates returned here are world coordinates. FilmSystem is an identity scene child.
 * Width expansion outside the reel is a deliberate display accommodation, not real film strain.
 */
export function buildFilmLayout(matrix: THREE.Matrix4, parameters: ReelGeometryParameters): FilmLayout {
  const samples: FilmSample[] = [];
  const rotation = new THREE.Quaternion().setFromRotationMatrix(matrix);
  const shaft = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).normalize();
  const world = (p: THREE.Vector3) => p.clone().applyMatrix4(matrix);
  const direction = (p: THREE.Vector3) => p.clone().transformDirection(matrix);
  const narrowWidth = parameters.filmPackWidth;
  const gateWidth = 1.8;
  const gateHeight = 1.0125;
  let distance = 0;
  const add = (center: THREE.Vector3, tangent: THREE.Vector3, widthAxis: THREE.Vector3, width: number, section: string) => {
    const t = tangent.clone().normalize();
    const w = widthAxis.clone().addScaledVector(t, -widthAxis.dot(t)).normalize();
    const previous = samples[samples.length - 1];
    if (previous && previous.center.distanceToSquared(center) < 1e-16) return;
    if (previous) distance += previous.center.distanceTo(center);
    samples.push({ center: center.clone(), tangent: t, widthAxis: w, width, distance, section });
  };
  const line = (a: THREE.Vector3, b: THREE.Vector3, axis: THREE.Vector3, width: number, section: string, steps = 48) => {
    const tangent = b.clone().sub(a).normalize();
    for (let i = 0; i <= steps; i++) add(a.clone().lerp(b, i / steps), tangent, axis, width, section);
  };
  const cubic = (
    a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3,
    startAxis: THREE.Vector3, endAxis: THREE.Vector3,
    startWidth: number, endWidth: number, section: string,
  ) => {
    const curve = new THREE.CubicBezierCurve3(a, b, c, d);
    let previousTangent = curve.getTangent(0).normalize();
    const transportedAxis = startAxis.clone().addScaledVector(previousTangent, -startAxis.dot(previousTangent)).normalize();
    const transported: THREE.Vector3[] = [];
    const tangents: THREE.Vector3[] = [];
    const steps = 80;
    const turn = new THREE.Quaternion();
    for (let i = 0; i <= steps; i++) {
      const tangent = curve.getTangent(i / steps).normalize();
      turn.setFromUnitVectors(previousTangent, tangent);
      transportedAxis.applyQuaternion(turn).normalize();
      transported.push(transportedAxis.clone());
      tangents.push(tangent);
      previousTangent = tangent;
    }
    const lastTangent = tangents[steps];
    const desired = endAxis.clone().addScaledVector(lastTangent, -endAxis.dot(lastTangent)).normalize();
    const lastAxis = transported[steps];
    const twist = Math.atan2(
      new THREE.Vector3().crossVectors(lastAxis, desired).dot(lastTangent),
      lastAxis.dot(desired),
    );
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const eased = smooth(t);
      const axis = transported[i].clone().applyAxisAngle(tangents[i], twist * eased);
      add(curve.getPoint(t), tangents[i], axis,
        THREE.MathUtils.lerp(startWidth, endWidth, eased), section);
    }
  };

  // Both circles share the reel-local XY winding plane and the same Z axle.
  // Common external tangent: dot(n, guideCenter) = R - r.
  const guideLocal = new THREE.Vector3(-1.4, 1.65, 0);
  const upperRadius = 0.12;
  const d = new THREE.Vector2(guideLocal.x, guideLocal.y);
  const unit = d.clone().normalize();
  const k = (parameters.windingRadius - upperRadius) / d.length();
  if (Math.abs(k) >= 1) throw new Error("Guide overlaps winding circle");
  const perpendicular = new THREE.Vector2(-unit.y, unit.x);
  const candidates = [1, -1].map(sign =>
    unit.clone().multiplyScalar(k).addScaledVector(perpendicular, sign * Math.sqrt(1 - k * k)));
  const normal = candidates[0].y > candidates[1].y ? candidates[0] : candidates[1];
  const exitLocal = new THREE.Vector3(normal.x, normal.y, 0).multiplyScalar(parameters.windingRadius);
  const contactLocal = guideLocal.clone().add(new THREE.Vector3(normal.x, normal.y, 0).multiplyScalar(upperRadius));
  const departure = world(exitLocal);
  const contact = world(contactLocal);
  const departureTangent = contact.clone().sub(departure).normalize();
  line(departure, contact, shaft, narrowWidth, "spool-span");

  const startAngle = Math.atan2(normal.y, normal.x);
  // Positive winding reaches the leftmost guide contact with a downward tangent.
  const endAngle = Math.PI;
  const arcSteps = 40;
  for (let i = 0; i <= arcSteps; i++) {
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, i / arcSteps);
    const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
    add(world(guideLocal.clone().addScaledVector(radial, upperRadius)),
      direction(new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0)),
      shaft, narrowWidth, "upper-contact");
  }
  const upperEnd = samples[samples.length - 1].center.clone();
  const upperTangent = samples[samples.length - 1].tangent.clone();
  // Move forward only AFTER the strip has cleared the outer flange radius.
  // Stay narrow and use parallel transport during the clearance bend.
  const clearance = upperEnd.clone().addScaledVector(shaft, 0.95).addScaledVector(upperTangent, 0.42);
  const clearanceTangent = new THREE.Vector3(0, -1, 0);
  cubic(upperEnd, upperEnd.clone().addScaledVector(upperTangent, 0.35),
    clearance.clone().addScaledVector(clearanceTangent, -0.3), clearance,
    shaft, shaft, narrowWidth, narrowWidth, "clearance");

  const gateRight = new THREE.Vector3(1.1, 0.05, 0.65);
  const gateLeft = gateRight.clone().add(new THREE.Vector3(-gateWidth, 0, 0));
  const gateAxis = new THREE.Vector3(0, 1, 0);
  cubic(clearance, clearance.clone().addScaledVector(clearanceTangent, 0.55),
    gateRight.clone().add(new THREE.Vector3(0.38, 0, 0)), gateRight,
    shaft, gateAxis, narrowWidth, gateHeight, "display-transition");
  const gateStartDistance = distance;
  line(gateRight, gateLeft, gateAxis, gateHeight, "gate", 72);
  const gateEndDistance = distance;

  // Narrow and turn the outgoing film before its small guide; never put a
  // full-height brass cylinder across the display aperture.
  const lowerRadius = 0.1;
  const lowerCenter = gateLeft.clone().add(new THREE.Vector3(-0.35, -0.75, 0));
  const lowerContact = lowerCenter.clone().add(new THREE.Vector3(0, lowerRadius, 0));
  const lowerAxis = new THREE.Vector3(0, 0, 1);
  cubic(gateLeft, gateLeft.clone().add(new THREE.Vector3(-0.25, 0, 0)),
    lowerContact.clone().add(new THREE.Vector3(0.25, 0, 0)), lowerContact,
    gateAxis, lowerAxis, gateHeight, narrowWidth, "outgoing-transition");
  for (let i = 0; i <= 32; i++) {
    const angle = Math.PI / 2 + i / 32 * Math.PI / 2;
    add(lowerCenter.clone().add(new THREE.Vector3(Math.cos(angle) * lowerRadius, Math.sin(angle) * lowerRadius, 0)),
      new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0), lowerAxis, narrowWidth, "lower-contact");
  }
  const lowerEnd = samples[samples.length - 1].center.clone();
  const outgoing = lowerEnd.clone().add(new THREE.Vector3(-0.15, -0.55, -0.25));
  cubic(lowerEnd, lowerEnd.clone().add(new THREE.Vector3(0, -0.25, 0)),
    outgoing.clone().add(new THREE.Vector3(0, 0.35, 0)), outgoing,
    lowerAxis, lowerAxis, narrowWidth, narrowWidth, "outgoing");
  return {
    samples, framePitch: gateWidth, gateStartDistance, gateEndDistance,
    departure, departureTangent,
    rollers: [
      { center: world(guideLocal), axis: shaft, radius: upperRadius, width: narrowWidth + 0.04, spinSign: 1 },
      { center: lowerCenter, axis: lowerAxis, radius: lowerRadius, width: narrowWidth + 0.04, spinSign: 1 },
    ],
  };
}

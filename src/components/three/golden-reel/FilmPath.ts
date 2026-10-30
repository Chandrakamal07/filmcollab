import * as THREE from "three";
import { FRAME_COUNT } from "./silhouette-atlas";
import { ReelGeometryParameters } from "./ReelGeometry";
import { buildFilmLayout } from "./film-layout";

export interface FilmSystem {
  group: THREE.Group;
  filmMesh: THREE.Mesh;
  filmMaterial: THREE.MeshBasicMaterial;
  upperRoller: THREE.Mesh;
  lowerRoller: THREE.Mesh;
  framePitch: number;
  upperRollerRadius: number;
  lowerRollerRadius: number;
  updateTransport: (transportInFrames: number) => void;
  dispose: () => void;
}

// Kept for callers which used the previous public helper.
export function calculateCircleTangents(p: THREE.Vector2, radius: number): [THREE.Vector2, THREE.Vector2] {
  const d2 = p.lengthSq();
  if (d2 <= radius * radius) throw new Error("Guide point must be outside the winding circle");
  const base = p.clone().multiplyScalar(radius * radius / d2);
  const perpendicular = new THREE.Vector2(-p.y, p.x);
  const factor = radius * Math.sqrt(d2 - radius * radius) / d2;
  return [
    base.clone().addScaledVector(perpendicular, factor),
    base.clone().addScaledVector(perpendicular, -factor),
  ];
}

export function createFilmSystem(
  atlasTexture: THREE.CanvasTexture,
  reelGroup: THREE.Group,
  reelParams: ReelGeometryParameters,
): FilmSystem {
  const group = new THREE.Group();
  group.name = "filmSystem";
  reelGroup.updateWorldMatrix(true, false);
  const layout = buildFilmLayout(reelGroup.matrixWorld, reelParams);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  layout.samples.forEach((sample, i) => {
    const half = sample.width / 2;
    const top = sample.center.clone().addScaledVector(sample.widthAxis, half);
    const bottom = sample.center.clone().addScaledVector(sample.widthAxis, -half);
    positions.push(top.x, top.y, top.z, bottom.x, bottom.y, bottom.z);
    // Samples run spool -> outgoing. Texture coordinates run left -> right.
    const u = (layout.gateEndDistance - sample.distance) / layout.framePitch;
    uvs.push(u, 1, u, 0);
    if (i < layout.samples.length - 1) {
      const j = i * 2;
      indices.push(j, j + 1, j + 2, j + 2, j + 1, j + 3);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  // Only the flat projection gate is illuminated. Keep the twisted feeder
  // dark so it does not display stretched people on its narrow edge.
  for (let i = 0; i < layout.samples.length - 1; i++) {
    const a = layout.samples[i];
    const b = layout.samples[i + 1];
    const inGate = a.distance >= layout.gateStartDistance - 1e-9 &&
      b.distance <= layout.gateEndDistance + 1e-9;
    geometry.addGroup(i * 6, 6, inGate ? 0 : 1);
  }
  geometry.computeVertexNormals();
  const filmMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const feederMaterial = new THREE.MeshStandardMaterial({
    color: "#18191c", metalness: 0.15, roughness: 0.52,
    side: THREE.DoubleSide,
  });
  const filmMesh = new THREE.Mesh(geometry, [filmMaterial, feederMaterial]);
  group.add(filmMesh);
  atlasTexture.repeat.set(1 / FRAME_COUNT, 1);
  atlasTexture.offset.set(0, 0);

  const brass = new THREE.MeshStandardMaterial({
    color: "#4a4438", metalness: 0.65, roughness: 0.42,
  });
  const rollers = layout.rollers.map(spec => {
    const geo = new THREE.CylinderGeometry(spec.radius, spec.radius, spec.width, 32);
    const mesh = new THREE.Mesh(geo, brass);
    mesh.position.copy(spec.center);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spec.axis);
    group.add(mesh);
    return { mesh, geo, base: mesh.quaternion.clone(), spec };
  });
  // Fixed rear support arms make guide rollers read as mounted hardware,
  // rather than floating gold spindles competing with the reel's true hub.
  const supports: THREE.BufferGeometry[] = [];
  const supportMaterial = new THREE.MeshStandardMaterial({
    color: "#232529", metalness: 0.55, roughness: 0.5,
  });
  const reelRear = new THREE.Vector3(0, 0, -0.28).applyMatrix4(reelGroup.matrixWorld);
  for (const { spec } of rollers) {
    const end = spec.center.clone().addScaledVector(spec.axis, -spec.width / 2 - 0.04);
    const delta = end.clone().sub(reelRear);
    const geo = new THREE.CylinderGeometry(0.018, 0.018, delta.length(), 12);
    supports.push(geo);
    const arm = new THREE.Mesh(geo, supportMaterial);
    arm.position.copy(reelRear).lerp(end, 0.5);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    group.add(arm);
  }
  const spin = new THREE.Quaternion();
  const localAxle = new THREE.Vector3(0, 1, 0);
  return {
    group, filmMesh, filmMaterial,
    upperRoller: rollers[0].mesh,
    lowerRoller: rollers[1].mesh,
    framePitch: layout.framePitch,
    upperRollerRadius: rollers[0].spec.radius,
    lowerRollerRadius: rollers[1].spec.radius,
    updateTransport(frames) {
      atlasTexture.offset.x = THREE.MathUtils.euclideanModulo(frames, FRAME_COUNT) / FRAME_COUNT;
      for (const { mesh, base, spec } of rollers) {
        spin.setFromAxisAngle(localAxle, spec.spinSign * frames * layout.framePitch / spec.radius);
        mesh.quaternion.copy(base).multiply(spin);
      }
    },
    dispose() {
      geometry.dispose();
      filmMaterial.dispose();
      feederMaterial.dispose();
      rollers.forEach(r => r.geo.dispose());
      brass.dispose();
      supports.forEach(g => g.dispose());
      supportMaterial.dispose();
    },
  };
}

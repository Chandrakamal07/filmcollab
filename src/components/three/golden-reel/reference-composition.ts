import * as THREE from "three";

/** Reference uses a single 16:9 camera plate, not an auto-fitted product viewer. */
export const REFERENCE_COMPOSITION = {
  aspect: 16 / 9,
  cameraZ: 12,
  verticalFov: 40,
  reelPosition: [-.6, 1.7, -2] as const,
  reelRotation: [.04, -.95, -.16] as const,
  reelScale: 1.45,
  presentationScale: .82,
};
export function placeReferenceReel(group: THREE.Group) {
  group.position.set(...REFERENCE_COMPOSITION.reelPosition);
  group.rotation.set(...REFERENCE_COMPOSITION.reelRotation);
  group.scale.setScalar(REFERENCE_COMPOSITION.reelScale);
  group.updateWorldMatrix(true, false);
}
export function frameReferenceCamera(camera: THREE.PerspectiveCamera, width: number, height: number) {
  camera.fov = REFERENCE_COMPOSITION.verticalFov;
  camera.aspect = width / height;
  // Contain the reference horizontally on wider displays; preserve its vertical
  // composition on 16:9. Narrow desktop crops use a slightly wider field.
  camera.position.set(0, 0, REFERENCE_COMPOSITION.cameraZ);
  camera.zoom = REFERENCE_COMPOSITION.presentationScale * Math.min(1, camera.aspect / REFERENCE_COMPOSITION.aspect);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

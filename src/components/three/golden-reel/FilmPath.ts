import * as THREE from "three";
import { FRAME_COUNT } from "./silhouette-atlas";
import { ReelGeometryParameters } from "./ReelGeometry";

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

/**
 * Calculates the two tangent points on a 2D circle from an external point.
 */
export function calculateCircleTangents(
  externalPoint: THREE.Vector2,
  radius: number
): [THREE.Vector2, THREE.Vector2] {
  const distanceSquared = externalPoint.lengthSq();
  if (distanceSquared <= radius * radius) {
    throw new Error("Guide point must be outside the winding circle");
  }

  const base = externalPoint.clone().multiplyScalar((radius * radius) / distanceSquared);
  const perpendicular = new THREE.Vector2(-externalPoint.y, externalPoint.x);
  const factor = (radius * Math.sqrt(distanceSquared - radius * radius)) / distanceSquared;

  return [
    base.clone().addScaledVector(perpendicular, factor),
    base.clone().addScaledVector(perpendicular, -factor),
  ];
}

export function createFilmSystem(
  atlasTexture: THREE.CanvasTexture,
  reelGroup: THREE.Group,
  reelParams: ReelGeometryParameters
): FilmSystem {
  const group = new THREE.Group();
  group.name = "filmSystem";

  const ownedGeometries: THREE.BufferGeometry[] = [];
  const ownedMaterials: THREE.Material[] = [];

  // Frame dimensions in 3D world units (16:9 widescreen cinematic gate)
  const gateWidth = 1.80;
  const gateHeight = 1.0125; // exact 16:9 ratio (1.80 / 1.0125 = 1.777)
  const framePitch = gateWidth; // exact 1-to-1 frame pitch

  // 1. Filmstrip Material
  const filmMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture,
    toneMapped: false,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
    transparent: false,
  });
  ownedMaterials.push(filmMaterial);

  atlasTexture.repeat.set(1 / FRAME_COUNT, 1);
  atlasTexture.offset.set(0, 0);

  // =========================================================
  // 2. Guide Roller Positions & Departure Tangent Calculation
  // =========================================================
  const upperRollerRadius = 0.12;
  const upperRollerPos = new THREE.Vector3(1.30, 0.75, -0.15);

  const lowerRollerRadius = 0.10;
  const lowerRollerPos = new THREE.Vector3(-0.95, -0.38, -0.10);

  // Calculate tangent departure from reel in reel-local coordinates
  reelGroup.updateWorldMatrix(true, false);
  const guideInReel = reelGroup.worldToLocal(upperRollerPos.clone());
  const guide2D = new THREE.Vector2(guideInReel.x, guideInReel.y);

  const candidates = calculateCircleTangents(guide2D, reelParams.windingRadius);
  // Select the upper tangent point exiting towards the guide roller
  const chosenLocal = candidates[0].y > candidates[1].y ? candidates[0] : candidates[1];

  // Local departure point is at Z = 0 (centered between the front and rear flanges)
  const exitInReel = new THREE.Vector3(chosenLocal.x, chosenLocal.y, 0.0);
  const spoolExitWorld = reelGroup.localToWorld(exitInReel.clone());

  // Spool tangent departure direction
  const spoolDepartureDir = upperRollerPos.clone().sub(spoolExitWorld).normalize();

  // Width direction at spool matches reel's local spindle axis (Z in reel local space)
  const spoolWidthDir = new THREE.Vector3(0, 0, 1).applyQuaternion(reelGroup.quaternion).normalize();
  const spoolWidth = reelParams.filmPackWidth; // 0.126m

  // =========================================================
  // 3. Piecewise Path Construction
  // Spool Tangent -> Upper Roller Arc -> Transition -> Viewing Gate -> Lower Roller Arc -> Outgoing
  // =========================================================
  const gateStartX = -0.70;
  const gateEndX = 1.10;
  const gateY = 0.05;
  const gateZ = 0.05;

  const gateStart = new THREE.Vector3(gateStartX, gateY, gateZ);
  const gateEnd = new THREE.Vector3(gateEndX, gateY, gateZ);

  // Upper roller contact tangent points
  const upperContactIn = upperRollerPos.clone().add(new THREE.Vector3(0, upperRollerRadius, 0));
  const upperContactOut = upperRollerPos.clone().add(new THREE.Vector3(-upperRollerRadius * 0.7, upperRollerRadius * 0.7, 0.05));

  // Lower roller contact tangent points
  const lowerContactIn = lowerRollerPos.clone().add(new THREE.Vector3(lowerRollerRadius * 0.5, lowerRollerRadius * 0.8, 0.02));
  const lowerContactOut = lowerRollerPos.clone().add(new THREE.Vector3(-lowerRollerRadius, 0, -0.05));
  const outgoingEnd = new THREE.Vector3(-1.25, -0.90, -0.28);

  // Explicit path definition from lower outgoing to spool
  // Parameterized from left (-X, outgoing) to right (+X, spool)
  const controlPoints = [
    outgoingEnd,                                            // 0: take-up shadow
    lowerContactOut,                                        // 1: leaving lower roller
    lowerRollerPos.clone().add(new THREE.Vector3(0, -lowerRollerRadius * 0.2, -0.05)), // 2: around lower roller
    lowerContactIn,                                         // 3: entering lower roller
    gateStart.clone().add(new THREE.Vector3(-0.12, -0.15, -0.02)), // 4: transition into gate
    gateStart,                                              // 5: GATE START (-0.70, 0.05, 0.05)
    new THREE.Vector3((gateStartX + gateEndX) * 0.5, gateY, gateZ), // 6: GATE CENTER (0.20, 0.05, 0.05)
    gateEnd,                                                // 7: GATE END (1.10, 0.05, 0.05)
    upperContactOut,                                        // 8: leaving upper roller
    upperContactIn,                                         // 9: contact top of upper roller
    spoolExitWorld,                                         // 10: SPOOL EXIT (tangent on winding circumference)
  ];

  const curve = new THREE.CatmullRomCurve3(controlPoints, false, "centripetal", 0.35);

  const segments = 160;
  const points = curve.getPoints(segments);

  // Calculate cumulative arc length along sampled points
  const cumDist: number[] = [0];
  for (let i = 1; i <= segments; i++) {
    cumDist[i] = cumDist[i - 1] + points[i].distanceTo(points[i - 1]);
  }

  // Find exact sample index corresponding to gateStart
  let gateStartIndex = 0;
  for (let i = 0; i < segments; i++) {
    if (points[i].x <= gateStartX && points[i + 1].x >= gateStartX) {
      gateStartIndex = i;
      break;
    }
  }
  const gateStartDist = cumDist[gateStartIndex];

  // Ribbon Vertex Attributes
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const viewingWidthDir = new THREE.Vector3(0, 1, 0); // Along +Y in viewing gate

  for (let i = 0; i <= segments; i++) {
    const pt = points[i];
    const t = i / segments;
    const tangent = curve.getTangent(t).normalize();

    // Determine ribbon width and orientation:
    // In gate: width = gateHeight (1.0125), direction = +Y
    // At spool: width = spoolWidth (0.126), direction = spoolWidthDir
    let currentWidth = gateHeight;
    const widthDir = viewingWidthDir.clone();

    if (pt.x > gateEndX) {
      // Transition between gate end and spool
      const span = Math.max(spoolExitWorld.x - gateEndX, 0.1);
      const frac = THREE.MathUtils.clamp((pt.x - gateEndX) / span, 0, 1);
      const ease = frac * frac * (3 - 2 * frac);

      // Width gradually widens/narrows
      currentWidth = THREE.MathUtils.lerp(gateHeight, spoolWidth, ease);
      // Direction gradually rotates between +Y and spool spindle axis
      widthDir.lerp(spoolWidthDir, ease).normalize();
    } else if (pt.x < gateStartX) {
      // Transition from gate start down to lower take-up
      const span = Math.max(gateStartX - outgoingEnd.x, 0.1);
      const frac = THREE.MathUtils.clamp((gateStartX - pt.x) / span, 0, 1);
      const ease = frac * frac * (3 - 2 * frac);

      currentWidth = THREE.MathUtils.lerp(gateHeight, spoolWidth * 1.5, ease);
      widthDir.lerp(new THREE.Vector3(0.3, 0.95, -0.1), ease).normalize();
    }

    const halfW = currentWidth * 0.5;
    const topPt = pt.clone().addScaledVector(widthDir, halfW);
    const btmPt = pt.clone().addScaledVector(widthDir, -halfW);

    positions.push(topPt.x, topPt.y, topPt.z);
    positions.push(btmPt.x, btmPt.y, btmPt.z);

    // UVs: u advances along ribbon length with exact 1-to-1 gate registration
    // topPt: v = 1 (top of frame, heads, top sprocket holes)
    // btmPt: v = 0 (bottom of frame, ground, bottom sprocket holes)
    const u = (cumDist[i] - gateStartDist) / framePitch;
    uvs.push(u, 1);
    uvs.push(u, 0);

    if (i < segments) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;

      indices.push(v0, v1, v2);
      indices.push(v2, v1, v3);
    }
  }

  const filmGeo = new THREE.BufferGeometry();
  filmGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  filmGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  filmGeo.setIndex(indices);
  filmGeo.computeVertexNormals();
  ownedGeometries.push(filmGeo);

  const filmMesh = new THREE.Mesh(filmGeo, filmMaterial);
  group.add(filmMesh);

  // =========================================================
  // 4. Brass Guide Rollers (Oriented to match film width at contact)
  // =========================================================
  const rollerBrassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#C8A258"),
    metalness: 0.90,
    roughness: 0.30,
  });
  ownedMaterials.push(rollerBrassMat);

  const upperRollerWidth = 0.28;
  const upperGeo = new THREE.CylinderGeometry(upperRollerRadius, upperRollerRadius, upperRollerWidth, 24);
  ownedGeometries.push(upperGeo);

  const upperRoller = new THREE.Mesh(upperGeo, rollerBrassMat);
  upperRoller.position.copy(upperRollerPos);
  // Align cylinder local axis (Y) with film width vector at upper contact
  const upperContactWidth = spoolWidthDir.clone().lerp(viewingWidthDir, 0.4).normalize();
  upperRoller.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), upperContactWidth);
  group.add(upperRoller);

  const lowerRollerWidth = 0.32;
  const lowerGeo = new THREE.CylinderGeometry(lowerRollerRadius, lowerRollerRadius, lowerRollerWidth, 24);
  ownedGeometries.push(lowerGeo);

  const lowerRoller = new THREE.Mesh(lowerGeo, rollerBrassMat);
  lowerRoller.position.copy(lowerRollerPos);
  // Align cylinder local axis (Y) with film width vector at lower contact
  const lowerContactWidth = viewingWidthDir.clone().lerp(new THREE.Vector3(0.3, 0.95, -0.1), 0.5).normalize();
  lowerRoller.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), lowerContactWidth);
  group.add(lowerRoller);

  // =========================================================
  // 5. Update Transport Sync (6-Frame repeating atlas)
  // =========================================================
  const updateTransport = (transportInFrames: number) => {
    // 6-frame repeating atlas offset
    const wrappedFrames = THREE.MathUtils.euclideanModulo(transportInFrames, FRAME_COUNT);
    atlasTexture.offset.x = wrappedFrames / FRAME_COUNT;

    // Rollers rotate synchronously with unwrapped travelled distance
    const distance = transportInFrames * framePitch;
    upperRoller.rotation.y = distance / upperRollerRadius;
    lowerRoller.rotation.y = -distance / lowerRollerRadius;
  };

  const dispose = () => {
    ownedGeometries.forEach((g) => g.dispose());
    ownedMaterials.forEach((m) => m.dispose());
  };

  return {
    group,
    filmMesh,
    filmMaterial,
    upperRoller,
    lowerRoller,
    framePitch,
    upperRollerRadius,
    lowerRollerRadius,
    updateTransport,
    dispose,
  };
}

import * as THREE from "three";
import { FRAME_COUNT } from "./silhouette-atlas";

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

export function createFilmSystem(atlasTexture: THREE.CanvasTexture): FilmSystem {
  const group = new THREE.Group();

  const ownedGeometries: THREE.BufferGeometry[] = [];
  const ownedMaterials: THREE.Material[] = [];

  // Frame dimensions in 3D world units (16:9 widescreen cinematic gate)
  const frameWidth = 2.00;
  const frameHeight = 1.125;
  const framePitch = frameWidth; // exact 1-to-1 frame pitch

  // 1. Filmstrip Material
  // MeshBasicMaterial with toneMapped: false so the silhouettes and warm backlight glow are rich and unwashed
  const filmMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture,
    toneMapped: false,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
    transparent: false,
  });
  ownedMaterials.push(filmMaterial);

  // Set repeat for atlas: each frame is 1 / FRAME_COUNT width
  atlasTexture.repeat.set(1 / FRAME_COUNT, 1);
  atlasTexture.offset.set(0, 0);

  // 2. Filmstrip Path & Ribbon Geometry
  // The path curves from lower shadow -> lower roller -> horizontal viewing gate -> upper roller -> reel spool
  // Viewing gate is from x = 0.00 to x = 2.00 at y = 0.05, z = 0.05 (prominent, flat, un-twisted)
  const curvePoints = [
    new THREE.Vector3(-0.45, -0.95, -0.30), // 0: Lower take-up area (shadow)
    new THREE.Vector3(-0.18, -0.38, -0.10), // 1: Lower tension roller
    new THREE.Vector3(0.00, 0.05, 0.05),    // 2: Entering viewing gate
    new THREE.Vector3(1.00, 0.05, 0.05),    // 3: CENTER OF VIEWING GATE (flat, prominent)
    new THREE.Vector3(2.00, 0.05, 0.05),    // 4: Leaving viewing gate
    new THREE.Vector3(2.18, 0.50, -0.15),   // 5: Upper guide roller
    new THREE.Vector3(2.35, 1.05, -0.38),   // 6: Tangent to Golden Reel spool
  ];

  const curve = new THREE.CatmullRomCurve3(curvePoints, false, "centripetal", 0.4);

  const segments = 120;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const points = curve.getPoints(segments);

  // Calculate cumulative arc lengths along the sampled points
  const cumDist: number[] = [0];
  for (let i = 1; i <= segments; i++) {
    cumDist[i] = cumDist[i - 1] + points[i].distanceTo(points[i - 1]);
  }

  // Find the exact arc length at the start of the viewing gate (where x crosses 0.00)
  let gateStartDist = 0;
  for (let i = 0; i < segments; i++) {
    if (points[i].x <= 0.00 && points[i + 1].x >= 0.00) {
      const frac = (0.00 - points[i].x) / Math.max(points[i + 1].x - points[i].x, 0.001);
      gateStartDist = cumDist[i] + frac * (cumDist[i + 1] - cumDist[i]);
      break;
    }
  }

  const refNormal = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= segments; i++) {
    const pt = points[i];
    const t = i / segments;
    const tangent = curve.getTangent(t).normalize();

    // Binormal perpendicular to reference normal and tangent
    let binormal = new THREE.Vector3().crossVectors(refNormal, tangent).normalize();
    if (binormal.lengthSq() < 0.1) {
      binormal = new THREE.Vector3(0, 1, 0);
    }
    // Ensure binormal points generally upwards (+Y)
    if (binormal.y < 0) {
      binormal.negate();
    }

    const topPt = pt.clone().addScaledVector(binormal, frameHeight * 0.5);
    const btmPt = pt.clone().addScaledVector(binormal, -frameHeight * 0.5);

    positions.push(topPt.x, topPt.y, topPt.z);
    positions.push(btmPt.x, btmPt.y, btmPt.z);

    // UVs: u advances along ribbon length (1.0 = 1 frame pitch = frameWidth)
    // topPt: v = 1 (top of canvas, heads, top sprocket holes)
    // btmPt: v = 0 (bottom of canvas, feet on ground, bottom sprocket holes)
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

  // 3. Brass Guide Rollers
  const rollerBrassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#C8A258"),
    metalness: 0.90,
    roughness: 0.30,
  });
  ownedMaterials.push(rollerBrassMat);

  const upperRollerRadius = 0.14;
  const lowerRollerRadius = 0.12;
  const rollerWidth = frameHeight * 1.08;

  // Upper Roller Geometry
  const upperGeo = new THREE.CylinderGeometry(upperRollerRadius, upperRollerRadius, rollerWidth, 24);
  upperGeo.rotateX(Math.PI / 2);
  ownedGeometries.push(upperGeo);

  const upperRoller = new THREE.Mesh(upperGeo, rollerBrassMat);
  upperRoller.position.set(2.18, 0.50, -0.15);
  group.add(upperRoller);

  // Lower Roller Geometry
  const lowerGeo = new THREE.CylinderGeometry(lowerRollerRadius, lowerRollerRadius, rollerWidth, 24);
  lowerGeo.rotateX(Math.PI / 2);
  ownedGeometries.push(lowerGeo);

  const lowerRoller = new THREE.Mesh(lowerGeo, rollerBrassMat);
  lowerRoller.position.set(-0.18, -0.38, -0.10);
  group.add(lowerRoller);

  // 4. Update Transport Sync
  const updateTransport = (transportInFrames: number) => {
    // Advances exactly 1 frame (1/FRAME_COUNT in atlas UV space) per frame transported
    const frameFraction = 1 / FRAME_COUNT;
    const uOffset = (transportInFrames * frameFraction) % 1.0;
    atlasTexture.offset.x = uOffset;

    // Rollers rotate synchronously with distance traveled
    const distance = transportInFrames * framePitch;
    upperRoller.rotation.z = distance / upperRollerRadius;
    lowerRoller.rotation.z = -distance / lowerRollerRadius;
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

import * as THREE from "three";

export interface ReelAssembly {
  group: THREE.Group;
  rotatingPart: THREE.Group;
  effectiveWindingRadius: number;
  outerRadius: number;
  dispose: () => void;
}

export function createGoldenReel(): ReelAssembly {
  const group = new THREE.Group();
  const rotatingPart = new THREE.Group();
  group.add(rotatingPart);

  const ownedGeometries: THREE.BufferGeometry[] = [];
  const ownedMaterials: THREE.Material[] = [];

  // Materials: Pale champagne gold & aged brass
  const champagneGoldMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#DEC085"),
    metalness: 0.85,
    roughness: 0.28,
  });
  ownedMaterials.push(champagneGoldMat);

  const agedBrassRimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#BA954E"),
    metalness: 0.90,
    roughness: 0.32,
  });
  ownedMaterials.push(agedBrassRimMat);

  const innerHubMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#9E7A38"),
    metalness: 0.82,
    roughness: 0.40,
  });
  ownedMaterials.push(innerHubMat);

  const woundFilmMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#121419"),
    metalness: 0.30,
    roughness: 0.55,
  });
  ownedMaterials.push(woundFilmMat);

  // 1. Construct Flange with real cutout circular openings
  const outerR = 1.60;
  const hubHoleR = 0.32;
  const windowCount = 6;
  const windowCenterR = 0.98;
  const windowRadius = 0.30;

  const flangeShape = new THREE.Shape();
  flangeShape.absarc(0, 0, outerR, 0, Math.PI * 2, false);

  // Center hub hole
  const centerHole = new THREE.Path();
  centerHole.absarc(0, 0, hubHoleR, 0, Math.PI * 2, true);
  flangeShape.holes.push(centerHole);

  // 6 Circular Cutout Window Holes
  for (let i = 0; i < windowCount; i++) {
    const angle = (i * Math.PI * 2) / windowCount;
    const wx = Math.cos(angle) * windowCenterR;
    const wy = Math.sin(angle) * windowCenterR;

    const windowHole = new THREE.Path();
    windowHole.absarc(wx, wy, windowRadius, 0, Math.PI * 2, true);
    flangeShape.holes.push(windowHole);
  }

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.022,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    curveSegments: 32,
  };

  const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, extrudeSettings);
  flangeGeo.center();
  ownedGeometries.push(flangeGeo);

  // Front Flange
  const frontFlange = new THREE.Mesh(flangeGeo, champagneGoldMat);
  frontFlange.position.z = 0.075;
  rotatingPart.add(frontFlange);

  // Rear Flange
  const rearFlange = new THREE.Mesh(flangeGeo, champagneGoldMat);
  rearFlange.position.z = -0.075;
  rotatingPart.add(rearFlange);

  // Reinforcing Outer Rims with beveled brass lip
  const rimTorusGeo = new THREE.TorusGeometry(outerR + 0.003, 0.012, 16, 64);
  ownedGeometries.push(rimTorusGeo);

  const frontRim = new THREE.Mesh(rimTorusGeo, agedBrassRimMat);
  frontRim.position.z = 0.088;
  rotatingPart.add(frontRim);

  const rearRim = new THREE.Mesh(rimTorusGeo, agedBrassRimMat);
  rearRim.position.z = -0.088;
  rotatingPart.add(rearRim);

  // 2. Central Core / Hub (Connects flanges)
  const coreHubR = 0.52;
  const coreHubWidth = 0.15;
  const coreHubGeo = new THREE.CylinderGeometry(coreHubR, coreHubR, coreHubWidth, 32);
  coreHubGeo.rotateX(Math.PI / 2);
  ownedGeometries.push(coreHubGeo);

  const coreHub = new THREE.Mesh(coreHubGeo, innerHubMat);
  rotatingPart.add(coreHub);

  // Concentric Hub Rings
  const hubRingGeo = new THREE.TorusGeometry(coreHubR * 0.75, 0.008, 12, 32);
  ownedGeometries.push(hubRingGeo);

  const frontHubRing = new THREE.Mesh(hubRingGeo, agedBrassRimMat);
  frontHubRing.position.z = 0.082;
  rotatingPart.add(frontHubRing);

  // 3. Wound Film Pack on Spool (physical film loaded on the reel)
  const woundFilmR = 0.92; // film wound partway out toward the cutouts
  const woundFilmGeo = new THREE.CylinderGeometry(woundFilmR, woundFilmR, coreHubWidth * 0.96, 48);
  woundFilmGeo.rotateX(Math.PI / 2);
  ownedGeometries.push(woundFilmGeo);

  const woundFilm = new THREE.Mesh(woundFilmGeo, woundFilmMat);
  rotatingPart.add(woundFilm);

  // 4. Center Drive Spindle & Cap (Stationary mount / hub axle)
  const axleR = 0.16;
  const axleGeo = new THREE.CylinderGeometry(axleR, axleR, 0.22, 24);
  axleGeo.rotateX(Math.PI / 2);
  ownedGeometries.push(axleGeo);

  const axle = new THREE.Mesh(axleGeo, agedBrassRimMat);
  group.add(axle); // stationary center mounting spindle

  const capGeo = new THREE.SphereGeometry(0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  capGeo.rotateX(Math.PI / 2);
  ownedGeometries.push(capGeo);

  const frontCap = new THREE.Mesh(capGeo, champagneGoldMat);
  frontCap.position.z = 0.11;
  group.add(frontCap);

  const dispose = () => {
    ownedGeometries.forEach((g) => g.dispose());
    ownedMaterials.forEach((m) => m.dispose());
  };

  return {
    group,
    rotatingPart,
    effectiveWindingRadius: woundFilmR,
    outerRadius: outerR,
    dispose,
  };
}


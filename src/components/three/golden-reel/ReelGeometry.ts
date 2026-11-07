import * as THREE from "three";

export interface ReelGeometryParameters {
  windingRadius: number;
  filmPackWidth: number;
  spindleAxis: THREE.Vector3;
  flangeFrontZ: number;
  flangeRearZ: number;
  flangeClearance: number;
}

export interface ReelAssembly {
  group: THREE.Group;
  rotatingSpool: THREE.Group;
  stationaryMount: THREE.Group;
  rotatingPart: THREE.Group; // Alias for backward compatibility
  parameters: ReelGeometryParameters;
  effectiveWindingRadius: number;
  outerRadius: number;
  dispose: () => void;
}

export function createGoldenReel(): ReelAssembly {
  const group = new THREE.Group();
  group.name = "reelAssembly";

  // 1. Stationary Mount (axle, mounting spindle, and front lock cap)
  const stationaryMount = new THREE.Group();
  stationaryMount.name = "stationaryMount";
  group.add(stationaryMount);

  // 2. Rotating Spool (front/rear flanges, core hub, wound film pack, rim torus)
  const rotatingSpool = new THREE.Group();
  rotatingSpool.name = "rotatingSpool";
  group.add(rotatingSpool);

  const ownedGeometries: THREE.BufferGeometry[] = [];
  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];

  // Materials: Pale champagne gold & aged brass
  const champagneGoldMat = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.32, clearcoatRoughness: 0.18,
    color: new THREE.Color("#DDAA52"),
    metalness: 0.85,
    roughness: 0.2,
  });
  ownedMaterials.push(champagneGoldMat);
  // A subtle brushed roughness map breaks up the perfectly uniform metal.
  // Keep geometry-only tests usable without a browser canvas.
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      let seed = 19;
      for (let y = 0; y < 256; y++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const value = 185 + seed % 60;
        ctx.fillStyle = `rgb(${value},${value},${value})`;
        ctx.fillRect(0, y, 256, 1);
      }
      const brushed = new THREE.CanvasTexture(canvas);
      brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
      brushed.repeat.set(5, 5);
      champagneGoldMat.roughnessMap = brushed;
      const patinaCanvas = document.createElement("canvas");
      patinaCanvas.width = patinaCanvas.height = 512;
      const paint = patinaCanvas.getContext("2d")!;
      const sheen = paint.createLinearGradient(0, 0, 512, 380);
      sheen.addColorStop(0, "#5d4228"); sheen.addColorStop(.28, "#e2c19a");
      sheen.addColorStop(.43, "#fff1d3"); sheen.addColorStop(.50, "#a9804a");
      sheen.addColorStop(.72, "#e7c89a"); sheen.addColorStop(1, "#6e4b2c");
      paint.fillStyle = sheen; paint.fillRect(0, 0, 512, 512);
      // Fine concentric tooling remains attached to the rotating metal.
      for (let r = 30; r < 255; r += 2) {
        paint.strokeStyle = r % 6 === 0 ? "rgba(33,19,7,.17)" : "rgba(255,238,199,.12)";
        paint.lineWidth = .6; paint.beginPath(); paint.arc(256, 256, r, 0, Math.PI * 2); paint.stroke();
      }
      const patina = new THREE.CanvasTexture(patinaCanvas);
      patina.colorSpace = THREE.SRGBColorSpace;
      // ExtrudeGeometry's planar face UVs are in local metres.
      patina.repeat.set(.25, .25); patina.offset.set(.5, .5);
      champagneGoldMat.map = patina;
      ownedTextures.push(patina);
      ownedTextures.push(brushed);
    }
  }

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

  // =========================================================
  // Flange Geometry: Genuine 3D cutouts through both flanges
  // =========================================================
  const outerR = 2.0;
  const hubHoleR = 0.32;
  const windowCount = 5;

  const flangeShape = new THREE.Shape();
  flangeShape.absarc(0, 0, outerR, 0, Math.PI * 2, false);

  // Center hub hole
  const centerHole = new THREE.Path();
  centerHole.absarc(0, 0, hubHoleR, 0, Math.PI * 2, true);
  flangeShape.holes.push(centerHole);

  // Rounded annular windows reproduce the reference reel's five broad spokes. The hole winding opposes the outer face.
  for (let i = 0; i < windowCount; i++) {
    const angle = i * Math.PI * 2 / windowCount;
    const windowHole = new THREE.Path();
    windowHole.absarc(0, 0, 1.70, angle + 0.32, angle - 0.32, true);
    windowHole.quadraticCurveTo(Math.cos(angle - .40) * 1.10, Math.sin(angle - .40) * 1.10,
      Math.cos(angle - .22) * .70, Math.sin(angle - .22) * .70);
    windowHole.absarc(0, 0, 0.70, angle - 0.22, angle + 0.22, false);
    windowHole.quadraticCurveTo(Math.cos(angle + .40) * 1.10, Math.sin(angle + .40) * 1.10,
      Math.cos(angle + .32) * 1.70, Math.sin(angle + .32) * 1.70);
    windowHole.closePath();
    flangeShape.holes.push(windowHole);
  }

  const flangeExtrudeDepth = 0.022;
  const flangeBevel = 0.005;
  const flangeTotalThickness = flangeExtrudeDepth + flangeBevel * 2; // 0.032
  const flangeHalfThick = flangeTotalThickness * 0.5; // 0.016

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: flangeExtrudeDepth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: flangeBevel,
    bevelThickness: flangeBevel,
    curveSegments: 32,
  };

  const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, extrudeSettings);
  flangeGeo.center(); // Extends along Z from -flangeHalfThick to +flangeHalfThick
  ownedGeometries.push(flangeGeo);

  // Flange Spacing & Measured Face Bounds
  const filmWidth = 0.95;
  const flangeCenterOffsetZ = filmWidth / 2 + flangeHalfThick + 0.012; // Z position of front and rear flange centers
  const flangeInnerFrontZ = flangeCenterOffsetZ - flangeHalfThick; // Inner face before the outward dish
  const flangeInnerRearZ = -flangeCenterOffsetZ + flangeHalfThick;  // Symmetric rear inner face
  const flangeClearance = flangeInnerFrontZ - flangeInnerRearZ;   // Minimum clear distance between inner faces
  const flangeOuterFrontZ = flangeCenterOffsetZ + flangeHalfThick; // Front face at the hub

  // Front Flange
  const frontGeometry = flangeGeo.clone();
  const rearGeometry = flangeGeo.clone();
  for (const [geometry, sign] of [[frontGeometry, 1], [rearGeometry, -1]] as const) {
    const position = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const radius = Math.hypot(x, y);
      position.setZ(i, position.getZ(i) + sign * 0.055 * (radius / outerR) ** 2);
      // Analytic inverse-transpose of the dish deformation. Recomputing
      // normals on non-indexed extrusion caps creates visible triangle facets.
      const nz = normals.getZ(i);
      const normal = new THREE.Vector3(
        normals.getX(i) - nz * sign * 0.11 * x / (outerR * outerR),
        normals.getY(i) - nz * sign * 0.11 * y / (outerR * outerR),
        nz,
      ).normalize();
      normals.setXYZ(i, normal.x, normal.y, normal.z);
    }
    ownedGeometries.push(geometry);
  }
  const frontFlange = new THREE.Mesh(frontGeometry, champagneGoldMat);
  frontFlange.position.z = flangeCenterOffsetZ;
  rotatingSpool.add(frontFlange);

  // Rear Flange
  const rearFlange = new THREE.Mesh(rearGeometry, champagneGoldMat);
  rearFlange.position.z = -flangeCenterOffsetZ;
  rotatingSpool.add(rearFlange);

  // Reinforcing Outer Rims with beveled brass lip
  const rimTorusGeo = new THREE.TorusGeometry(outerR + 0.003, 0.012, 16, 64);
  ownedGeometries.push(rimTorusGeo);

  const frontRim = new THREE.Mesh(rimTorusGeo, agedBrassRimMat);
  frontRim.position.z = flangeOuterFrontZ + 0.055;
  rotatingSpool.add(frontRim);

  const rearRim = new THREE.Mesh(rimTorusGeo, agedBrassRimMat);
  rearRim.position.z = -flangeOuterFrontZ - 0.055;
  rotatingSpool.add(rearRim);
  // Rolled lips and rivets give the broad front surface real depth cues.
  for (const radius of [1.92, .55]) {
    const ring = new THREE.TorusGeometry(radius, .014, 8, 96);
    ownedGeometries.push(ring);
    const mesh = new THREE.Mesh(ring, agedBrassRimMat);
    mesh.position.z = flangeOuterFrontZ + .055 * (radius / outerR) ** 2 + .008;
    rotatingSpool.add(mesh);
  }
  const rivetGeometry = new THREE.SphereGeometry(.032, 10, 8);
  ownedGeometries.push(rivetGeometry);
  for (let i = 0; i < windowCount; i++) {
    const angle = (i + .5) / windowCount * Math.PI * 2;
    const rivet = new THREE.Mesh(rivetGeometry, agedBrassRimMat);
    rivet.scale.z = .35;
    rivet.position.set(Math.cos(angle) * .59, Math.sin(angle) * .59, flangeOuterFrontZ + .014);
    rotatingSpool.add(rivet);
  }

  // =========================================================
  // Central Core / Hub (Connects flanges coaxially along Z)
  // =========================================================
  const coreHubR = 0.50;
  const coreHubWidth = flangeClearance + 0.004; // fits securely between inner flange faces
  const coreHubGeo = new THREE.CylinderGeometry(coreHubR, coreHubR, coreHubWidth, 32);
  coreHubGeo.rotateX(Math.PI / 2); // local cylinder axis along Z
  ownedGeometries.push(coreHubGeo);

  const coreHub = new THREE.Mesh(coreHubGeo, innerHubMat);
  rotatingSpool.add(coreHub);

  // Concentric Hub Rings on front face
  const hubRingGeo = new THREE.TorusGeometry(coreHubR * 0.75, 0.008, 12, 32);
  ownedGeometries.push(hubRingGeo);

  const frontHubRing = new THREE.Mesh(hubRingGeo, agedBrassRimMat);
  frontHubRing.position.z = flangeOuterFrontZ;
  rotatingSpool.add(frontHubRing);

  // =========================================================
  // Wound Film Pack on Spool (loaded between the flanges)
  // =========================================================
  const woundFilmR = 0.92; // Winding circle radius
  const woundFilmWidth = filmWidth; // 0.126m, clears both flanges
  const woundFilmGeo = new THREE.CylinderGeometry(woundFilmR, woundFilmR, woundFilmWidth, 48);
  woundFilmGeo.rotateX(Math.PI / 2);
  ownedGeometries.push(woundFilmGeo);

  const woundFilm = new THREE.Mesh(woundFilmGeo, woundFilmMat);
  rotatingSpool.add(woundFilm);

  // =========================================================
  // Stationary Mount: Coaxial Central Axle & Front Cap
  // =========================================================
  const axleR = 0.14;
  const axleLength = flangeOuterFrontZ * 2 + 0.06; // 0.256m
  const axleGeo = new THREE.CylinderGeometry(axleR, axleR, axleLength, 24);
  axleGeo.rotateX(Math.PI / 2); // Cylinder along Z
  ownedGeometries.push(axleGeo);

  const axle = new THREE.Mesh(axleGeo, agedBrassRimMat);
  stationaryMount.add(axle);

  // Front Retaining Collar & Cap:
  // Cap dome must face OUTWARDS (+Z toward viewer), with base seated flush on flange front face
  const capRadius = 0.13;
  // Hemisphere with apex at +Y in local geometry, rotated around X by +PI/2 maps apex to +Z
  const capGeo = new THREE.SphereGeometry(capRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  capGeo.rotateX(Math.PI / 2); // Dome apex now points along +Z, base is at Z = 0
  ownedGeometries.push(capGeo);

  const frontCap = new THREE.Mesh(capGeo, champagneGoldMat);
  // Position base exactly at flange outer front face (no gap, not embedded)
  frontCap.position.z = flangeOuterFrontZ;
  stationaryMount.add(frontCap);

  // Decorative brass collar seated flush against flange face
  const collarGeo = new THREE.CylinderGeometry(axleR * 1.18, axleR * 1.18, 0.010, 24);
  collarGeo.rotateX(Math.PI / 2);
  ownedGeometries.push(collarGeo);

  const frontCollar = new THREE.Mesh(collarGeo, agedBrassRimMat);
  frontCollar.position.z = flangeOuterFrontZ + 0.005;
  stationaryMount.add(frontCollar);

  const parameters: ReelGeometryParameters = {
    windingRadius: woundFilmR,
    filmPackWidth: woundFilmWidth,
    spindleAxis: new THREE.Vector3(0, 0, 1),
    flangeFrontZ: flangeInnerFrontZ,
    flangeRearZ: flangeInnerRearZ,
    flangeClearance,
  };

  const dispose = () => {
    ownedTextures.forEach((t) => t.dispose());
    ownedGeometries.forEach((g) => g.dispose());
    ownedMaterials.forEach((m) => m.dispose());
  };

  return {
    group,
    rotatingSpool,
    stationaryMount,
    get rotatingPart() {
      return rotatingSpool;
    },
    parameters,
    effectiveWindingRadius: woundFilmR,
    outerRadius: outerR,
    dispose,
  };
}


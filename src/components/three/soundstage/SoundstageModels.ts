import * as THREE from "three";

export function createDirectorChair(): THREE.Group {
  const chair = new THREE.Group();
  chair.name = "DirectorsChair";
  chair.userData = { componentId: "chair" };

  const woodMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#18191D"),
    metalness: 0.12,
    roughness: 0.72,
    name: "BlackAshWood",
  });

  const metalHingeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#757B86"),
    metalness: 0.85,
    roughness: 0.28,
    name: "MachinedSteelHardware",
  });

  const canvasMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1C1E24"),
    metalness: 0.05,
    roughness: 0.88,
    name: "HeavyCanvasFabric",
  });

  const brassRivetMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#E9B457"),
    metalness: 0.82,
    roughness: 0.3,
    name: "BrassRivets",
  });

  // Scissor X-frame legs (Left & Right pairs)
  const legGeo = new THREE.BoxGeometry(0.045, 1.15, 0.04);
  const scissorAngle = 0.38;

  // Left scissor pair
  const legL1 = new THREE.Mesh(legGeo, woodMat);
  legL1.position.set(-0.38, 0.52, 0);
  legL1.rotation.z = scissorAngle;
  chair.add(legL1);

  const legL2 = new THREE.Mesh(legGeo, woodMat);
  legL2.position.set(-0.38, 0.52, 0);
  legL2.rotation.z = -scissorAngle;
  chair.add(legL2);

  // Right scissor pair
  const legR1 = new THREE.Mesh(legGeo, woodMat);
  legR1.position.set(0.38, 0.52, 0);
  legR1.rotation.z = scissorAngle;
  chair.add(legR1);

  const legR2 = new THREE.Mesh(legGeo, woodMat);
  legR2.position.set(0.38, 0.52, 0);
  legR2.rotation.z = -scissorAngle;
  chair.add(legR2);

  // Pivot bolts at scissor centers
  const boltGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.08, 16);
  boltGeo.rotateZ(Math.PI / 2);
  const boltL = new THREE.Mesh(boltGeo, metalHingeMat);
  boltL.position.set(-0.38, 0.52, 0);
  chair.add(boltL);

  const boltR = new THREE.Mesh(boltGeo, metalHingeMat);
  boltR.position.set(0.38, 0.52, 0);
  chair.add(boltR);

  // Horizontal Cross Stretchers (Braces)
  const stretcherGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 16);
  stretcherGeo.rotateZ(Math.PI / 2);

  const stretchBottomF = new THREE.Mesh(stretcherGeo, woodMat);
  stretchBottomF.position.set(0, 0.16, 0.22);
  chair.add(stretchBottomF);

  const stretchBottomB = new THREE.Mesh(stretcherGeo, woodMat);
  stretchBottomB.position.set(0, 0.16, -0.22);
  chair.add(stretchBottomB);

  // Seat frame rails (horizontal bars holding canvas)
  const seatRailGeo = new THREE.BoxGeometry(0.04, 0.04, 0.56);
  const seatRailL = new THREE.Mesh(seatRailGeo, woodMat);
  seatRailL.position.set(-0.38, 0.95, 0);
  chair.add(seatRailL);

  const seatRailR = new THREE.Mesh(seatRailGeo, woodMat);
  seatRailR.position.set(0.38, 0.95, 0);
  chair.add(seatRailR);

  // Canvas Seat (Taut fabric between rails with slight sag)
  const seatCanvasGeo = new THREE.BoxGeometry(0.74, 0.018, 0.5);
  const seatCanvas = new THREE.Mesh(seatCanvasGeo, canvasMat);
  seatCanvas.position.set(0, 0.94, 0);
  chair.add(seatCanvas);

  // Seat Rivets
  for (const z of [-0.2, -0.1, 0, 0.1, 0.2]) {
    const rivetL = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), brassRivetMat);
    rivetL.position.set(-0.38, 0.97, z);
    chair.add(rivetL);

    const rivetR = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), brassRivetMat);
    rivetR.position.set(0.38, 0.97, z);
    chair.add(rivetR);
  }

  // Backrest upright posts (extended upward from rear legs)
  const backPostGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.65, 16);
  const backPostL = new THREE.Mesh(backPostGeo, woodMat);
  backPostL.position.set(-0.38, 1.25, -0.22);
  backPostL.rotation.x = -0.06;
  chair.add(backPostL);

  const backPostR = new THREE.Mesh(backPostGeo, woodMat);
  backPostR.position.set(0.38, 1.25, -0.22);
  backPostR.rotation.x = -0.06;
  chair.add(backPostR);

  // Backrest top caps
  const capGeo = new THREE.SphereGeometry(0.028, 16, 16);
  const capL = new THREE.Mesh(capGeo, brassRivetMat);
  capL.position.set(-0.38, 1.58, -0.24);
  chair.add(capL);

  const capR = new THREE.Mesh(capGeo, brassRivetMat);
  capR.position.set(0.38, 1.58, -0.24);
  chair.add(capR);

  // Heavy Canvas Backrest Panel
  const backCanvasGeo = new THREE.BoxGeometry(0.72, 0.26, 0.018);
  const backCanvas = new THREE.Mesh(backCanvasGeo, canvasMat);
  backCanvas.position.set(0, 1.38, -0.23);
  backCanvas.rotation.x = -0.06;
  chair.add(backCanvas);

  // Armrests (flat sculpted oak/ash)
  const armrestGeo = new THREE.BoxGeometry(0.06, 0.025, 0.54);
  const armrestL = new THREE.Mesh(armrestGeo, woodMat);
  armrestL.position.set(-0.38, 1.14, 0.02);
  chair.add(armrestL);

  const armrestR = new THREE.Mesh(armrestGeo, woodMat);
  armrestR.position.set(0.38, 1.14, 0.02);
  chair.add(armrestR);

  // Footrest rung at bottom front
  const footrestGeo = new THREE.BoxGeometry(0.8, 0.035, 0.08);
  const footrest = new THREE.Mesh(footrestGeo, woodMat);
  footrest.position.set(0, 0.35, 0.28);
  chair.add(footrest);

  // Cast and receive shadows on all child meshes
  chair.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData = { componentId: "chair" };
    }
  });

  return chair;
}

export function createCameraRig(): THREE.Group {
  const cameraRig = new THREE.Group();
  cameraRig.name = "CinemaCameraRig";
  cameraRig.userData = { componentId: "camera" };

  const chassisMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#13151A"),
    metalness: 0.85,
    roughness: 0.24,
    name: "DarkTitaniumChassis",
  });

  const machinedSteelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#565C68"),
    metalness: 0.9,
    roughness: 0.2,
    name: "MachinedSteel",
  });

  const amberAccentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#E9B457"),
    metalness: 0.75,
    roughness: 0.3,
    name: "AmberAnodizedKnobs",
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0C1824"),
    roughness: 0.05,
    metalness: 0.95,
    name: "CoatedOpticalGlass",
  });

  const rubberMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1B1C20"),
    roughness: 0.85,
    metalness: 0.08,
    name: "RubberWheelsGrip",
  });

  // --- 1. DOLLY BASE PLATFORM ---
  const dollyBase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 1.1), chassisMat);
  dollyBase.position.set(0, 0.12, 0);
  cameraRig.add(dollyBase);

  // 4 Skate dolly wheel sets
  for (const wx of [-0.4, 0.4]) {
    for (const wz of [-0.42, 0.42]) {
      const wheelPair = new THREE.Group();
      wheelPair.position.set(wx, 0.06, wz);

      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 12), machinedSteelMat);
      axle.rotateZ(Math.PI / 2);
      wheelPair.add(axle);

      for (const side of [-0.07, 0.07]) {
        const tireGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.035, 16);
        tireGeo.rotateZ(Math.PI / 2);
        const tire = new THREE.Mesh(tireGeo, rubberMat);
        tire.position.x = side;
        wheelPair.add(tire);
      }
      cameraRig.add(wheelPair);
    }
  }

  // --- 2. HYDRAULIC RISER COLUMN ---
  const riserOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.65, 24), chassisMat);
  riserOuter.position.set(0, 0.48, 0);
  cameraRig.add(riserOuter);

  const riserInner = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 24), machinedSteelMat);
  riserInner.position.set(0, 0.88, 0);
  cameraRig.add(riserInner);

  const columnLockRing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 24), amberAccentMat);
  columnLockRing.position.set(0, 0.78, 0);
  cameraRig.add(columnLockRing);

  // --- 3. FLUID HEAD PLATFORM ---
  const headBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 24), chassisMat);
  headBase.position.set(0, 1.18, 0);
  cameraRig.add(headBase);

  // Pan / Tilt knobs
  const panKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 16), amberAccentMat);
  panKnob.rotateZ(Math.PI / 2);
  panKnob.position.set(0.15, 1.18, 0.06);
  cameraRig.add(panKnob);

  // Pan Handle (curved arm extending back)
  const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.55, 16), machinedSteelMat);
  handleBar.position.set(-0.16, 1.25, -0.28);
  handleBar.rotation.x = -0.55;
  cameraRig.add(handleBar);

  const handleGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 16), rubberMat);
  handleGrip.position.set(-0.16, 1.12, -0.48);
  handleGrip.rotation.x = -0.55;
  cameraRig.add(handleGrip);

  // --- 4. CAMERA BODY (Cinema 35mm Form Factor) ---
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 1.34, 0);

  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.44), chassisMat);
  bodyGroup.add(mainBody);

  // Top Handle
  const topHandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.38), machinedSteelMat);
  topHandle.position.set(0, 0.22, 0);
  bodyGroup.add(topHandle);

  const handlePostF = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), machinedSteelMat);
  handlePostF.position.set(0, 0.17, 0.14);
  bodyGroup.add(handlePostF);

  const handlePostB = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), machinedSteelMat);
  handlePostB.position.set(0, 0.17, -0.14);
  bodyGroup.add(handlePostB);

  // Side Media Bay & Battery Plate
  const batteryPlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.12), chassisMat);
  batteryPlate.position.set(0, 0.02, -0.28);
  bodyGroup.add(batteryPlate);

  const vMountLock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), amberAccentMat);
  vMountLock.position.set(0, 0.04, -0.35);
  bodyGroup.add(vMountLock);

  // Top Director Monitor (EVF / LCD)
  const monitorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 12), machinedSteelMat);
  monitorArm.position.set(0.16, 0.24, 0.08);
  monitorArm.rotation.z = 0.4;
  bodyGroup.add(monitorArm);

  const monitorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.035), chassisMat);
  monitorHousing.position.set(0.25, 0.34, 0.08);
  monitorHousing.rotation.y = -0.35;
  bodyGroup.add(monitorHousing);

  const monitorScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.14),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1B2230"),
      emissive: new THREE.Color("#E9B457"),
      emissiveIntensity: 0.2,
      roughness: 0.1,
    })
  );
  monitorScreen.position.set(0.25, 0.34, 0.098);
  monitorScreen.rotation.y = -0.35;
  bodyGroup.add(monitorScreen);

  // --- 5. 15MM RODS & LENS SYSTEM ---
  // Dual 15mm Base Rods
  for (const rx of [-0.08, 0.08]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.65, 16), machinedSteelMat);
    rod.rotateX(Math.PI / 2);
    rod.position.set(rx, -0.16, 0.18);
    bodyGroup.add(rod);
  }

  // Anamorphic Prime Lens Barrel
  const lensBarrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.105, 0.18, 24), chassisMat);
  lensBarrel1.rotateX(Math.PI / 2);
  lensBarrel1.position.set(0, 0, 0.31);
  bodyGroup.add(lensBarrel1);

  // Focus Gear Ring
  const focusRing = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.05, 32), machinedSteelMat);
  focusRing.rotateX(Math.PI / 2);
  focusRing.position.set(0, 0, 0.36);
  bodyGroup.add(focusRing);

  // Amber Lens Accent Band
  const lensBand = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.015, 24), amberAccentMat);
  lensBand.rotateX(Math.PI / 2);
  lensBand.position.set(0, 0, 0.4);
  bodyGroup.add(lensBand);

  // Front Lens Glass
  const frontGlass = new THREE.Mesh(new THREE.SphereGeometry(0.088, 24, 24, 0, Math.PI * 2, 0, Math.PI / 4), glassMat);
  frontGlass.rotateX(Math.PI / 2);
  frontGlass.position.set(0, 0, 0.42);
  bodyGroup.add(frontGlass);

  // Production Matte Box (Sunshade + Eyebrow Flag)
  const matteBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.1), chassisMat);
  matteBox.position.set(0, 0, 0.52);
  bodyGroup.add(matteBox);

  const topFlag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.01, 0.14), chassisMat);
  topFlag.position.set(0, 0.14, 0.55);
  topFlag.rotation.x = -0.22;
  bodyGroup.add(topFlag);

  cameraRig.add(bodyGroup);

  // Cast and receive shadows
  cameraRig.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData = { componentId: "camera" };
    }
  });

  return cameraRig;
}

export function createDollyTrack(): THREE.Group {
  const track = new THREE.Group();
  track.name = "DollyTrackCurved";
  track.userData = { componentId: "track" };

  const steelRailMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#6B7382"),
    metalness: 0.92,
    roughness: 0.22,
    name: "SteelRailTubing",
  });

  const sleeperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#18191D"),
    metalness: 0.15,
    roughness: 0.78,
    name: "TrackCrossSleeper",
  });

  // Track arc curve: gentle sweep across floor
  const radius = 6.2;
  const startAngle = -0.35;
  const endAngle = 0.55;
  const segments = 36;
  const gauge = 0.68; // distance between rails

  const innerRadius = radius - gauge / 2;
  const outerRadius = radius + gauge / 2;

  // Rail 1 (Inner tubular rail)
  const innerCurvePoints: THREE.Vector3[] = [];
  const outerCurvePoints: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = startAngle + t * (endAngle - startAngle);
    // Offset center of circle so track curves naturally around the chair focal point
    const cx = -0.8;
    const cz = -3.8;
    innerCurvePoints.push(new THREE.Vector3(cx + Math.sin(a) * innerRadius, 0.038, cz + Math.cos(a) * innerRadius));
    outerCurvePoints.push(new THREE.Vector3(cx + Math.sin(a) * outerRadius, 0.038, cz + Math.cos(a) * outerRadius));
  }

  const innerCurve = new THREE.CatmullRomCurve3(innerCurvePoints);
  const outerCurve = new THREE.CatmullRomCurve3(outerCurvePoints);

  const railInnerMesh = new THREE.Mesh(new THREE.TubeGeometry(innerCurve, 48, 0.024, 12, false), steelRailMat);
  track.add(railInnerMesh);

  const railOuterMesh = new THREE.Mesh(new THREE.TubeGeometry(outerCurve, 48, 0.024, 12, false), steelRailMat);
  track.add(railOuterMesh);

  // Cross sleepers (Ties every few feet along the curve)
  const tieCount = 18;
  for (let i = 0; i <= tieCount; i++) {
    const t = i / tieCount;
    const a = startAngle + t * (endAngle - startAngle);
    const pIn = innerCurve.getPointAt(t);
    const pOut = outerCurve.getPointAt(t);

    const mid = new THREE.Vector3().addVectors(pIn, pOut).multiplyScalar(0.5);
    const tieGeo = new THREE.BoxGeometry(gauge + 0.18, 0.025, 0.08);
    const tie = new THREE.Mesh(tieGeo, sleeperMat);
    tie.position.set(mid.x, 0.014, mid.z);

    const angle = Math.atan2(pOut.x - pIn.x, pOut.z - pIn.z);
    tie.rotation.y = angle - Math.PI / 2;

    track.add(tie);
  }

  track.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.receiveShadow = true;
      child.castShadow = true;
      child.userData = { componentId: "track" };
    }
  });

  return track;
}

export function createOverheadLighting(): THREE.Group {
  const rig = new THREE.Group();
  rig.name = "OverheadLightingRig";
  rig.userData = { componentId: "rig" };

  const trussMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#363B45"),
    metalness: 0.88,
    roughness: 0.32,
    name: "AluminumBoxTruss",
  });

  const fresnelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1A1D24"),
    metalness: 0.65,
    roughness: 0.4,
    name: "FresnelHousing",
  });

  const lensGlassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#FFE5C2"),
    emissive: new THREE.Color("#E9B457"),
    emissiveIntensity: 0.9,
    roughness: 0.15,
    name: "LitFresnelLens",
  });

  // Box Truss Section overhead
  const trussY = 4.8;
  const trussLength = 8.5;

  // 4 main chords (tubes)
  for (const cx of [-0.35, 0.35]) {
    for (const cy of [trussY - 0.35, trussY + 0.35]) {
      const chord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, trussLength, 12), trussMat);
      chord.rotateZ(Math.PI / 2);
      chord.position.set(0, cy, cx);
      rig.add(chord);
    }
  }

  // Cross braces along truss
  for (let i = 0; i < 14; i++) {
    const x = -3.8 + i * 0.6;
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.72, 0.72), trussMat);
    brace.position.set(x, trussY, 0);
    rig.add(brace);
  }

  // Large Fresnel Spotlight Fixture
  const fresnelGroup = new THREE.Group();
  fresnelGroup.name = "FresnelLight";
  fresnelGroup.userData = { componentId: "fresnel" };
  fresnelGroup.position.set(0.6, trussY - 0.55, 0.8);
  fresnelGroup.rotation.x = -0.55;
  fresnelGroup.rotation.y = -0.32;

  // C-Clamp & Yoke
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), trussMat);
  clamp.position.set(0, 0.32, 0);
  fresnelGroup.add(clamp);

  const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 12, 24, Math.PI), trussMat);
  yoke.position.set(0, 0, 0);
  fresnelGroup.add(yoke);

  // Cylindrical Ribbed Housing
  const bodyGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.62, 24);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, fresnelMat);
  fresnelGroup.add(body);

  // Ribbed heat fins
  for (let f = 0; f < 6; f++) {
    const fin = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.015, 8, 24), fresnelMat);
    fin.position.set(0, 0, -0.22 + f * 0.08);
    fresnelGroup.add(fin);
  }

  // Stepped Fresnel Lens (Front)
  const lensGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 32);
  lensGeo.rotateX(Math.PI / 2);
  const lens = new THREE.Mesh(lensGeo, lensGlassMat);
  lens.name = "FresnelLensMesh";
  lens.position.set(0, 0, 0.32);
  fresnelGroup.add(lens);

  // 4 Barn Doors (Leaves)
  const doorMat = new THREE.MeshStandardMaterial({
    color: "#0E1013",
    metalness: 0.6,
    roughness: 0.4,
  });

  const doorTop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.012, 0.28), doorMat);
  doorTop.position.set(0, 0.32, 0.42);
  doorTop.rotation.x = 0.4;
  fresnelGroup.add(doorTop);

  const doorBottom = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.012, 0.28), doorMat);
  doorBottom.position.set(0, -0.32, 0.42);
  doorBottom.rotation.x = -0.4;
  fresnelGroup.add(doorBottom);

  const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.55, 0.28), doorMat);
  doorL.position.set(-0.32, 0, 0.42);
  doorL.rotation.y = -0.4;
  fresnelGroup.add(doorL);

  const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.55, 0.28), doorMat);
  doorR.position.set(0.32, 0, 0.42);
  doorR.rotation.y = 0.4;
  fresnelGroup.add(doorR);

  rig.add(fresnelGroup);

  rig.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (!child.userData.componentId) {
        child.userData = { componentId: "rig" };
      }
    }
  });

  return rig;
}

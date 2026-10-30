import * as THREE from "three";

export const TRACK_CONFIG = {
  centerX: 0,
  centerZ: 0,
  centerlineRadius: 2.35,
  gauge: 0.65,
  minAngle: THREE.MathUtils.degToRad(-66),
  maxAngle: THREE.MathUtils.degToRad(66),
  railTubeRadius: 0.022,
  railHeight: 0.055,
  wheelRadius: 0.055,
};

export function createDirectorChair(): THREE.Group {
  const chair = new THREE.Group();
  chair.name = "DirectorsChair";
  chair.userData = { componentId: "chair" };

  // Calibrated materials: non-metallic wood and canvas
  const woodMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#25272F"),
    metalness: 0.06,
    roughness: 0.68,
    name: "BlackAshWood",
  });

  const metalHingeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#787E8C"),
    metalness: 0.88,
    roughness: 0.22,
    name: "MachinedSteelHardware",
  });

  const canvasMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#282A32"),
    metalness: 0.04,
    roughness: 0.88,
    name: "HeavyCanvasFabric",
  });

  const brassRivetMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#E9B457"),
    metalness: 0.82,
    roughness: 0.28,
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
    color: new THREE.Color("#22252C"),
    metalness: 0.28,
    roughness: 0.58,
    name: "MatteGraphiteChassis",
  });

  const machinedSteelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#788090"),
    metalness: 0.9,
    roughness: 0.2,
    name: "MachinedSteel",
  });

  const amberAccentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#E9B457"),
    metalness: 0.78,
    roughness: 0.28,
    name: "AmberAnodizedKnobs",
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#162838"),
    roughness: 0.08,
    metalness: 0.2,
    name: "CoatedOpticalGlass",
  });

  const rubberWheelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#15171C"),
    roughness: 0.82,
    metalness: 0.12,
    name: "TrackDollyWheelRubber",
  });

  // --- 1. DOLLY CHASSIS ROOT ---
  const dollyChassis = new THREE.Group();
  dollyChassis.name = "DollyChassis";
  cameraRig.add(dollyChassis);

  // Platform deck: positioned at y = 0.14m (clearing wheels and rails)
  const platform = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 0.95), chassisMat);
  platform.position.set(0, 0.14, 0);
  dollyChassis.add(platform);

  // Skid grip footpads on deck
  for (const side of [-0.22, 0.22]) {
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.008, 0.75),
      new THREE.MeshStandardMaterial({ color: "#16181E", roughness: 0.9 })
    );
    pad.position.set(side, 0.174, 0);
    dollyChassis.add(pad);
  }

  // --- 2. ARTICULATED WHEEL BOGIES ---
  const wheelRadius = TRACK_CONFIG.wheelRadius;
  const halfGauge = TRACK_CONFIG.gauge / 2;
  const bogieOffsetZ = 0.28;

  // Chord angle compensation for circular track curvature
  const chordAngle = Math.asin(bogieOffsetZ / TRACK_CONFIG.centerlineRadius);

  // A. Front Bogie Assembly (Z = +0.28)
  const frontBogie = new THREE.Group();
  frontBogie.name = "Bogie_Front";
  frontBogie.position.set(0, 0.11, bogieOffsetZ);
  frontBogie.rotation.y = chordAngle;
  dollyChassis.add(frontBogie);

  // B. Rear Bogie Assembly (Z = -0.28)
  const rearBogie = new THREE.Group();
  rearBogie.name = "Bogie_Rear";
  rearBogie.position.set(0, 0.11, -bogieOffsetZ);
  rearBogie.rotation.y = -chordAngle;
  dollyChassis.add(rearBogie);

  // Helper to create a dual flanged skate wheel assembly on axle
  function createAxleAssembly(isFront: boolean): THREE.Group {
    const axleGroup = new THREE.Group();
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, TRACK_CONFIG.gauge + 0.08, 16), machinedSteelMat);
    axle.rotateZ(Math.PI / 2);
    axleGroup.add(axle);

    for (const sideX of [-halfGauge, halfGauge]) {
      const wheelHub = new THREE.Group();
      wheelHub.name = `Wheel_${isFront ? "F" : "R"}_${sideX < 0 ? "Left" : "Right"}`;
      wheelHub.position.x = sideX;

      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.038, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, rubberWheelMat);
      tire.name = "WheelTireMesh";
      wheelHub.add(tire);

      const hubcap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.042, 16), machinedSteelMat);
      hubcap.rotateZ(Math.PI / 2);
      wheelHub.add(hubcap);

      axleGroup.add(wheelHub);
    }
    return axleGroup;
  }

  frontBogie.add(createAxleAssembly(true));
  rearBogie.add(createAxleAssembly(false));

  // --- 3. HYDRAULIC RISER COLUMN ---
  const riserOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.55, 24), chassisMat);
  riserOuter.position.set(0, 0.44, 0);
  dollyChassis.add(riserOuter);

  const riserInner = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.52, 24), machinedSteelMat);
  riserInner.position.set(0, 0.82, 0);
  dollyChassis.add(riserInner);

  const columnLockRing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 24), amberAccentMat);
  columnLockRing.position.set(0, 0.72, 0);
  dollyChassis.add(columnLockRing);

  // --- 4. ARTICULATED PAN-TILT FLUID HEAD GROUP ---
  const panHeadGroup = new THREE.Group();
  panHeadGroup.name = "PanHeadGroup";
  panHeadGroup.position.set(0, 1.1, 0);
  cameraRig.add(panHeadGroup);

  const headBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 24), chassisMat);
  headBase.position.set(0, 0, 0);
  panHeadGroup.add(headBase);

  // Pan / Tilt knobs
  const panKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 16), amberAccentMat);
  panKnob.rotateZ(Math.PI / 2);
  panKnob.position.set(0.15, 0, 0.06);
  panHeadGroup.add(panKnob);

  // Pan Handle extending backwards
  const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.55, 16), machinedSteelMat);
  handleBar.position.set(-0.16, 0.06, -0.28);
  handleBar.rotation.x = -0.55;
  panHeadGroup.add(handleBar);

  const handleGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 16), rubberWheelMat);
  handleGrip.position.set(-0.16, -0.07, -0.48);
  handleGrip.rotation.x = -0.55;
  panHeadGroup.add(handleGrip);

  // --- 5. CAMERA BODY (Cinema 35mm Form Factor) ---
  const bodyGroup = new THREE.Group();
  bodyGroup.name = "CameraBodyGroup";
  bodyGroup.position.set(0, 0.18, 0);
  panHeadGroup.add(bodyGroup);

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
      emissiveIntensity: 0.25,
      roughness: 0.15,
    })
  );
  monitorScreen.position.set(0.25, 0.34, 0.098);
  monitorScreen.rotation.y = -0.35;
  bodyGroup.add(monitorScreen);

  // --- 6. 15MM RODS & LENS SYSTEM ---
  for (const rx of [-0.08, 0.08]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.65, 16), machinedSteelMat);
    rod.rotateX(Math.PI / 2);
    rod.position.set(rx, -0.16, 0.18);
    bodyGroup.add(rod);
  }

  // Anamorphic Prime Lens Barrel
  const lensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.105, 0.18, 24), chassisMat);
  lensBarrel.rotateX(Math.PI / 2);
  lensBarrel.position.set(0, 0, 0.31);
  bodyGroup.add(lensBarrel);

  // Focus Gear Ring - Named explicitly as FocusRing
  const focusRing = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.05, 32), machinedSteelMat);
  focusRing.name = "FocusRing";
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
    color: new THREE.Color("#828B9C"),
    metalness: 0.92,
    roughness: 0.18,
    name: "SteelRailTubing",
  });

  const sleeperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1C1E24"),
    metalness: 0.12,
    roughness: 0.78,
    name: "TrackCrossSleeper",
  });

  const bufferStopMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#E9B457"),
    metalness: 0.8,
    roughness: 0.3,
    name: "TrackBufferStop",
  });

  const R = TRACK_CONFIG.centerlineRadius;
  const gauge = TRACK_CONFIG.gauge;
  const minA = TRACK_CONFIG.minAngle;
  const maxA = TRACK_CONFIG.maxAngle;
  const segments = 48;
  const tubeRadius = TRACK_CONFIG.railTubeRadius;
  const railY = TRACK_CONFIG.railHeight;

  const innerRadius = R - gauge / 2;
  const outerRadius = R + gauge / 2;

  // Rail curves in 3D
  const innerPoints: THREE.Vector3[] = [];
  const outerPoints: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = minA + t * (maxA - minA);
    const sinA = Math.sin(a);
    const cosA = Math.cos(a);
    innerPoints.push(new THREE.Vector3(TRACK_CONFIG.centerX + sinA * innerRadius, railY, TRACK_CONFIG.centerZ + cosA * innerRadius));
    outerPoints.push(new THREE.Vector3(TRACK_CONFIG.centerX + sinA * outerRadius, railY, TRACK_CONFIG.centerZ + cosA * outerRadius));
  }

  const innerCurve = new THREE.CatmullRomCurve3(innerPoints);
  const outerCurve = new THREE.CatmullRomCurve3(outerPoints);

  const railInnerMesh = new THREE.Mesh(new THREE.TubeGeometry(innerCurve, 64, tubeRadius, 14, false), steelRailMat);
  track.add(railInnerMesh);

  const railOuterMesh = new THREE.Mesh(new THREE.TubeGeometry(outerCurve, 64, tubeRadius, 14, false), steelRailMat);
  track.add(railOuterMesh);

  // Sleepers (Cross ties spaced every ~3.5 degrees)
  const tieCount = 36;
  for (let i = 0; i <= tieCount; i++) {
    const t = i / tieCount;
    const a = minA + t * (maxA - minA);
    const sinA = Math.sin(a);
    const cosA = Math.cos(a);

    const midX = TRACK_CONFIG.centerX + sinA * R;
    const midZ = TRACK_CONFIG.centerZ + cosA * R;

    const tieGeo = new THREE.BoxGeometry(gauge + 0.16, 0.02, 0.075);
    const tie = new THREE.Mesh(tieGeo, sleeperMat);
    tie.position.set(midX, 0.01, midZ);
    tie.rotation.y = a;

    track.add(tie);
  }

  // End stops / Buffers at track terminals (-66° and +66°)
  for (const endAngle of [minA, maxA]) {
    const sinA = Math.sin(endAngle);
    const cosA = Math.cos(endAngle);

    for (const sideR of [innerRadius, outerRadius]) {
      const stopX = TRACK_CONFIG.centerX + sinA * sideR;
      const stopZ = TRACK_CONFIG.centerZ + cosA * sideR;
      const stopMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.065, 16), bufferStopMat);
      stopMesh.position.set(stopX, railY + 0.02, stopZ);
      track.add(stopMesh);
    }
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
    color: new THREE.Color("#444B57"),
    metalness: 0.85,
    roughness: 0.28,
    name: "AluminumBoxTruss",
  });

  const fresnelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#222630"),
    metalness: 0.5,
    roughness: 0.45,
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
  fresnelGroup.position.set(0.4, trussY - 0.55, 1.2);
  fresnelGroup.rotation.x = -0.58;
  fresnelGroup.rotation.y = -0.25;

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
    color: "#181A20",
    metalness: 0.5,
    roughness: 0.45,
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

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface ObsidianComponent {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const OBSIDIAN_COMPONENTS: Record<string, ObsidianComponent> = {
  front_bezel: {
    id: "front_bezel",
    name: "114mm Cinema Front & Filter Hood",
    category: "Optics / Housing",
    description: "Industry-standard 114mm matte box outer diameter with 95mm screw-in front filter threads and internal anti-flare micro-grooves.",
  },
  front_optics: {
    id: "front_optics",
    name: "Aspherical Front Meniscus Element",
    category: "Optical System",
    description: "High-index fluorite aspherical front meniscus element with multi-layer anti-reflective nano-coating. Controls chromatic aberration and anamorphic flare.",
  },
  internal_optics: {
    id: "internal_optics",
    name: "Internal Corrective Doublet & Light Baffles",
    category: "Optical System",
    description: "Anomalous dispersion cemented doublet seated inside precision CNC stepped anti-reflective light baffles.",
  },
  iris_assembly: {
    id: "iris_assembly",
    name: "11-Blade Articulated Cinema Iris",
    category: "Mechanical Aperture",
    description: "Calibrated 11-blade mechanical iris mechanism with curved carbon-steel leaves. Delivers perfect circular bokeh highlights from wide open (T1.5) down to T22.",
  },
  focus_ring: {
    id: "focus_ring",
    name: "0.8 Mod Precision Focus Ring",
    category: "Mechanics / Follow-Focus",
    description: "Industry-standard 0.8 metric module gear ring with 270° smooth rotation throw, tactile knurled grip collars, and calibrated dual metric/imperial witness markings.",
  },
  aperture_ring: {
    id: "aperture_ring",
    name: "0.8 Mod De-Clicked Aperture Ring",
    category: "Mechanics / Iris Control",
    description: "Fluid de-clicked iris ring with continuous T-stop calibration (T1.5 – T22) and 0.8 Mod follow-focus teeth.",
  },
  mid_barrel: {
    id: "mid_barrel",
    name: "Obsidian Machined Chassis & Metadata Port",
    category: "Chassis / Electronics",
    description: "Matte graphite aluminum chassis with longitudinal structural flutes and electronic lens communication interface.",
  },
  rear_optics: {
    id: "rear_optics",
    name: "Rear Telecentric Optical Group",
    category: "Optical System",
    description: "Recessed telecentric rear optical elements ensuring perpendicular light rays onto the digital cinema sensor.",
  },
  pl_mount: {
    id: "pl_mount",
    name: "Stainless Steel / Titanium PL Mount",
    category: "Mount / Flange",
    description: "Industry-standard 54mm Positive Lock (PL) cinema camera mount flange with 4 precision stainless steel locking lugs.",
  },
};

export const T_STOPS = [
  { value: 1.0, label: "T1.5", desc: "Wide Open // Ultra-Shallow DOF" },
  { value: 0.85, label: "T2.0", desc: "Fast Aperture // High Transmission" },
  { value: 0.70, label: "T2.8", desc: "Cinema Sweet Spot // Crisp Contrast" },
  { value: 0.55, label: "T4.0", desc: "Balanced Sharpness // Controlled Falloff" },
  { value: 0.40, label: "T5.6", desc: "Deep Focus // Studio Standard" },
  { value: 0.28, label: "T8.0", desc: "Deep Field // High Acutance" },
  { value: 0.18, label: "T11", desc: "Max Depth // Production Landscape" },
  { value: 0.09, label: "T16", desc: "Stopped Down // Minimal Flare" },
  { value: 0.0, label: "T22", desc: "Pinhole // Maximum Diffraction" },
];

export interface BladePivotData {
  pivotGroup: THREE.Group;
  baseAngle: number;
}

export interface ObsidianLensController {
  root: THREE.Group;
  presentationRoot: THREE.Group;
  focusRingPivot: THREE.Group;
  apertureRingPivot: THREE.Group;
  internalOpticsGroup: THREE.Group | null;
  bladePivots: BladePivotData[];
  setAperture: (openness: number) => void;
  getAperture: () => number;
  setFocus: (progress: number) => void;
  getFocus: () => number;
  getHoveredComponent: (raycaster: THREE.Raycaster) => ObsidianComponent | null;
  update: (deltaSeconds: number, animate: boolean, reducedMotion: boolean) => void;
  dispose: () => void;
}

/**
 * Procedural Fallback Builder for the Obsidian 50mm T1.5 Cinema Prime Lens.
 * Creates physically plausible materials and sub-millimeter geometry matching
 * public/models/obsidian-lens.glb.
 */
export function createProceduralObsidianLens(): {
  root: THREE.Group;
  presentationRoot: THREE.Group;
  focusRingPivot: THREE.Group;
  apertureRingPivot: THREE.Group;
  internalOpticsGroup: THREE.Group;
  bladePivots: BladePivotData[];
} {
  const root = new THREE.Group();
  root.name = "ObsidianLensRoot";

  // Physically based materials
  const graphiteHousing = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1F2227"),
    metalness: 0.16,
    roughness: 0.38,
    name: "GraphiteHousing",
  });

  const blackAnodized = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0C0D10"),
    metalness: 0.72,
    roughness: 0.28,
    name: "BlackAnodized",
  });

  const machinedTitanium = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#707886"),
    metalness: 0.90,
    roughness: 0.22,
    name: "MachinedTitanium",
  });

  const stainlessSteel = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#8A92A0"),
    metalness: 0.94,
    roughness: 0.18,
    name: "StainlessSteel",
  });

  const amberAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#E9B457"),
    emissive: new THREE.Color("#2A1C06"),
    emissiveIntensity: 0.35,
    metalness: 0.82,
    roughness: 0.25,
    name: "AmberAccent",
  });

  const irisBladeSteel = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#181A20"),
    metalness: 0.88,
    roughness: 0.30,
    name: "IrisBladeSteel",
  });

  const frontOpticalGlass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#FFFFFF"),
    metalness: 0.0,
    roughness: 0.025,
    transmission: 0.96,
    ior: 1.52,
    thickness: 0.008,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    name: "FrontOpticalGlass",
  });

  const internalOpticalGlass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#EEF5F9"),
    metalness: 0.0,
    roughness: 0.02,
    transmission: 0.92,
    ior: 1.55,
    thickness: 0.006,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    name: "InternalOpticalGlass",
  });

  const presentationRoot = new THREE.Group();
  presentationRoot.name = "PresentationRoot";
  root.add(presentationRoot);

  // 1. Front Bezel & Filter Hood (114mm matte box standard)
  const frontBezelGroup = new THREE.Group();
  frontBezelGroup.name = "FrontBezelGroup";
  frontBezelGroup.userData = { componentId: "front_bezel" };

  const outerCollarGeo = new THREE.CylinderGeometry(0.057, 0.057, 0.028, 64, 1, true);
  outerCollarGeo.rotateX(Math.PI / 2);
  const outerCollar = new THREE.Mesh(outerCollarGeo, graphiteHousing);
  outerCollar.position.set(0, 0, 0.088);
  frontBezelGroup.add(outerCollar);

  const frontLipTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.0565, 0.0018, 16, 64),
    machinedTitanium
  );
  frontLipTorus.position.set(0, 0, 0.102);
  frontBezelGroup.add(frontLipTorus);

  const chamferConeGeo = new THREE.CylinderGeometry(0.056, 0.048, 0.012, 64, 1, true);
  chamferConeGeo.rotateX(Math.PI / 2);
  const chamferCone = new THREE.Mesh(chamferConeGeo, blackAnodized);
  chamferCone.position.set(0, 0, 0.096);
  frontBezelGroup.add(chamferCone);

  const threadCollarGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.010, 64, 1, true);
  threadCollarGeo.rotateX(Math.PI / 2);
  const threadCollar = new THREE.Mesh(threadCollarGeo, blackAnodized);
  threadCollar.position.set(0, 0, 0.088);
  frontBezelGroup.add(threadCollar);

  for (let r = 0; r < 4; r++) {
    const threadRidge = new THREE.Mesh(
      new THREE.TorusGeometry(0.0478, 0.0004, 8, 64),
      machinedTitanium
    );
    threadRidge.position.set(0, 0, 0.084 + r * 0.002);
    frontBezelGroup.add(threadRidge);
  }

  const spannerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.044, 0.0475, 64),
    blackAnodized
  );
  spannerRing.position.set(0, 0, 0.083);
  frontBezelGroup.add(spannerRing);

  for (let s = 0; s < 4; s++) {
    const sAngle = (s * Math.PI) / 2 + Math.PI / 4;
    const notch = new THREE.Mesh(
      new THREE.BoxGeometry(0.0025, 0.004, 0.002),
      machinedTitanium
    );
    notch.position.set(Math.cos(sAngle) * 0.046, Math.sin(sAngle) * 0.046, 0.0835);
    notch.rotation.z = sAngle;
    frontBezelGroup.add(notch);
  }

  const frontAmberRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.0568, 0.0007, 12, 64),
    amberAccent
  );
  frontAmberRing.position.set(0, 0, 0.076);
  frontBezelGroup.add(frontAmberRing);

  presentationRoot.add(frontBezelGroup);

  // 2. Front Optics Group (Curved Meniscus Glass)
  const frontOpticsGroup = new THREE.Group();
  frontOpticsGroup.name = "FrontOpticsGroup";
  frontOpticsGroup.userData = { componentId: "front_optics" };

  const frontGlassGeo = new THREE.SphereGeometry(0.052, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.32);
  frontGlassGeo.rotateX(Math.PI / 2);
  const frontGlass = new THREE.Mesh(frontGlassGeo, frontOpticalGlass);
  frontGlass.position.set(0, 0, 0.050);
  frontOpticsGroup.add(frontGlass);

  const innerGlassGeo = new THREE.SphereGeometry(0.044, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.28);
  innerGlassGeo.rotateX(-Math.PI / 2);
  const innerGlass = new THREE.Mesh(innerGlassGeo, frontOpticalGlass);
  innerGlass.position.set(0, 0, 0.048);
  frontOpticsGroup.add(innerGlass);

  const frontCellGeo = new THREE.CylinderGeometry(0.046, 0.045, 0.016, 48, 1, true);
  frontCellGeo.rotateX(Math.PI / 2);
  const frontCell = new THREE.Mesh(frontCellGeo, blackAnodized);
  frontCell.position.set(0, 0, 0.056);
  frontOpticsGroup.add(frontCell);

  presentationRoot.add(frontOpticsGroup);

  // 3. Internal Optics Group (Corrective Doublet & Conical Baffles)
  const internalOpticsGroup = new THREE.Group();
  internalOpticsGroup.name = "InternalOpticsGroup";
  internalOpticsGroup.userData = { componentId: "internal_optics" };

  const doubletGeo = new THREE.SphereGeometry(0.038, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.25);
  doubletGeo.rotateX(Math.PI / 2);
  const doublet = new THREE.Mesh(doubletGeo, internalOpticalGlass);
  doublet.position.set(0, 0, 0.024);
  internalOpticsGroup.add(doublet);

  for (let b = 0; b < 3; b++) {
    const baffleGeo = new THREE.CylinderGeometry(0.042 - b * 0.003, 0.040 - b * 0.003, 0.006, 48, 1, true);
    baffleGeo.rotateX(Math.PI / 2);
    const baffleMesh = new THREE.Mesh(baffleGeo, blackAnodized);
    baffleMesh.position.set(0, 0, 0.032 - b * 0.008);
    internalOpticsGroup.add(baffleMesh);
  }

  presentationRoot.add(internalOpticsGroup);

  // 4. Iris Assembly (11 Individually Articulated Blades)
  const irisAssemblyGroup = new THREE.Group();
  irisAssemblyGroup.name = "IrisAssemblyGroup";
  irisAssemblyGroup.position.set(0, 0, 0);
  irisAssemblyGroup.userData = { componentId: "iris_assembly" };

  const irisHousingGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.014, 48, 1, true);
  irisHousingGeo.rotateX(Math.PI / 2);
  const irisHousing = new THREE.Mesh(irisHousingGeo, blackAnodized);
  irisAssemblyGroup.add(irisHousing);

  const irisGuideRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.0435, 0.0012, 12, 48),
    machinedTitanium
  );
  irisGuideRing.position.set(0, 0, 0.005);
  irisAssemblyGroup.add(irisGuideRing);

  const numBlades = 11;
  const pivotRadius = 0.034;
  const bladePivots: BladePivotData[] = [];

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.bezierCurveTo(0.016, 0.010, 0.028, 0.022, 0.038, 0.014);
  bladeShape.lineTo(0.034, 0.008);
  bladeShape.bezierCurveTo(0.024, 0.014, 0.012, 0.006, 0.003, -0.004);
  bladeShape.closePath();

  const bladeGeometry = new THREE.ShapeGeometry(bladeShape, 12);

  for (let i = 0; i < numBlades; i++) {
    const baseAngle = (i * Math.PI * 2) / numBlades;
    const pivotX = Math.cos(baseAngle) * pivotRadius;
    const pivotY = Math.sin(baseAngle) * pivotRadius;
    const bladeZ = (i - (numBlades - 1) / 2) * 0.00035;

    const pivotGroup = new THREE.Group();
    pivotGroup.name = `IrisBladePivot_${i}`;
    pivotGroup.position.set(pivotX, pivotY, bladeZ);
    pivotGroup.rotation.z = baseAngle;

    const bladeMesh = new THREE.Mesh(bladeGeometry, irisBladeSteel);
    bladeMesh.name = `IrisBladeMesh_${i}`;
    bladeMesh.castShadow = true;
    bladeMesh.receiveShadow = true;

    const rivet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0012, 0.0012, 0.0015, 12),
      machinedTitanium
    );
    rivet.rotation.x = Math.PI / 2;
    rivet.position.set(0, 0, 0.0008);
    pivotGroup.add(rivet);

    pivotGroup.add(bladeMesh);
    irisAssemblyGroup.add(pivotGroup);

    bladePivots.push({ pivotGroup, baseAngle });
  }

  presentationRoot.add(irisAssemblyGroup);

  // 5. Focus Ring & 0.8 Mod Cine Gear
  const focusRingPivot = new THREE.Group();
  focusRingPivot.name = "FocusRingPivot";
  focusRingPivot.position.set(0, 0, 0);

  const focusRingGroup = new THREE.Group();
  focusRingGroup.name = "FocusRingGroup";
  focusRingGroup.userData = { componentId: "focus_ring" };

  const focusBarrelGeo = new THREE.CylinderGeometry(0.054, 0.054, 0.046, 64, 1, true);
  focusBarrelGeo.rotateX(Math.PI / 2);
  const focusBarrel = new THREE.Mesh(focusBarrelGeo, graphiteHousing);
  focusBarrel.position.set(0, 0, 0.043);
  focusRingGroup.add(focusBarrel);

  const numFocusTeeth = 72;
  const gearRadius = 0.0552;
  const toothGeo = new THREE.BoxGeometry(0.0020, 0.0018, 0.024);

  const focusGearGroup = new THREE.Group();
  focusGearGroup.name = "FocusGearTeeth";
  for (let t = 0; t < numFocusTeeth; t++) {
    const tAngle = (t * Math.PI * 2) / numFocusTeeth;
    const toothMesh = new THREE.Mesh(toothGeo, machinedTitanium);
    toothMesh.position.set(
      Math.cos(tAngle) * gearRadius,
      Math.sin(tAngle) * gearRadius,
      0.042
    );
    toothMesh.rotation.z = tAngle;
    focusGearGroup.add(toothMesh);
  }
  focusRingGroup.add(focusGearGroup);

  const knurlRingFront = new THREE.Mesh(
    new THREE.TorusGeometry(0.0545, 0.0012, 12, 64),
    machinedTitanium
  );
  knurlRingFront.position.set(0, 0, 0.059);
  focusRingGroup.add(knurlRingFront);

  const knurlRingRear = new THREE.Mesh(
    new THREE.TorusGeometry(0.0545, 0.0012, 12, 64),
    machinedTitanium
  );
  knurlRingRear.position.set(0, 0, 0.027);
  focusRingGroup.add(knurlRingRear);

  const scaleCollarGeo = new THREE.CylinderGeometry(0.0535, 0.0535, 0.012, 64, 1, true);
  scaleCollarGeo.rotateX(Math.PI / 2);
  const scaleCollar = new THREE.Mesh(scaleCollarGeo, blackAnodized);
  scaleCollar.position.set(0, 0, 0.020);
  focusRingGroup.add(scaleCollar);

  for (let m = 0; m < 12; m++) {
    const mAngle = (m * Math.PI * 1.5) / 12 - Math.PI * 0.75;
    const tickGeo = new THREE.BoxGeometry(0.001, 0.0006, 0.008);
    const tickMat = m % 3 === 0 ? amberAccent : machinedTitanium;
    const tick = new THREE.Mesh(tickGeo, tickMat);
    tick.position.set(
      Math.cos(mAngle) * 0.0538,
      Math.sin(mAngle) * 0.0538,
      0.020
    );
    tick.rotation.z = mAngle;
    focusRingGroup.add(tick);
  }

  focusRingPivot.add(focusRingGroup);
  presentationRoot.add(focusRingPivot);

  const focusWitnessMark = new THREE.Mesh(
    new THREE.BoxGeometry(0.0015, 0.003, 0.012),
    amberAccent
  );
  focusWitnessMark.position.set(0, 0.055, 0.019);
  presentationRoot.add(focusWitnessMark);

  // 6. Aperture Ring & 0.8 Mod Cine Gear
  const apertureRingPivot = new THREE.Group();
  apertureRingPivot.name = "ApertureRingPivot";
  apertureRingPivot.position.set(0, 0, 0);

  const apertureRingGroup = new THREE.Group();
  apertureRingGroup.name = "ApertureRingGroup";
  apertureRingGroup.userData = { componentId: "aperture_ring" };

  const apertureBarrelGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.028, 64, 1, true);
  apertureBarrelGeo.rotateX(Math.PI / 2);
  const apertureBarrel = new THREE.Mesh(apertureBarrelGeo, graphiteHousing);
  apertureBarrel.position.set(0, 0, -0.030);
  apertureRingGroup.add(apertureBarrel);

  const numIrisTeeth = 64;
  const irisGearRadius = 0.0532;
  const irisToothGeo = new THREE.BoxGeometry(0.002, 0.0016, 0.018);

  const irisGearGroup = new THREE.Group();
  irisGearGroup.name = "ApertureGearTeeth";
  for (let t = 0; t < numIrisTeeth; t++) {
    const tAngle = (t * Math.PI * 2) / numIrisTeeth;
    const toothMesh = new THREE.Mesh(irisToothGeo, machinedTitanium);
    toothMesh.position.set(
      Math.cos(tAngle) * irisGearRadius,
      Math.sin(tAngle) * irisGearRadius,
      -0.030
    );
    toothMesh.rotation.z = tAngle;
    irisGearGroup.add(toothMesh);
  }
  apertureRingGroup.add(irisGearGroup);

  for (let t = 0; t < 9; t++) {
    const tAngle = (t * Math.PI * 0.9) / 8 - Math.PI * 0.45;
    const tTickGeo = new THREE.BoxGeometry(0.001, 0.0006, 0.006);
    const tTick = new THREE.Mesh(tTickGeo, t === 0 ? amberAccent : machinedTitanium);
    tTick.position.set(
      Math.cos(tAngle) * 0.0525,
      Math.sin(tAngle) * 0.0525,
      -0.019
    );
    tTick.rotation.z = tAngle;
    apertureRingGroup.add(tTick);
  }

  apertureRingPivot.add(apertureRingGroup);
  presentationRoot.add(apertureRingPivot);

  // 7. Middle Barrel & Electronics
  const midBarrelGroup = new THREE.Group();
  midBarrelGroup.name = "MidBarrelGroup";
  midBarrelGroup.userData = { componentId: "mid_barrel" };

  const midBarrelGeo = new THREE.CylinderGeometry(0.050, 0.051, 0.032, 64, 1, true);
  midBarrelGeo.rotateX(Math.PI / 2);
  const midBarrel = new THREE.Mesh(midBarrelGeo, graphiteHousing);
  midBarrel.position.set(0, 0, -0.060);
  midBarrelGroup.add(midBarrel);

  for (let f = 0; f < 16; f++) {
    const fAngle = (f * Math.PI * 2) / 16;
    const fluteGeo = new THREE.BoxGeometry(0.003, 0.002, 0.024);
    const flute = new THREE.Mesh(fluteGeo, blackAnodized);
    flute.position.set(
      Math.cos(fAngle) * 0.0505,
      Math.sin(fAngle) * 0.0505,
      -0.060
    );
    flute.rotation.z = fAngle;
    midBarrelGroup.add(flute);
  }

  const midTiRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.0508, 0.0012, 12, 64),
    machinedTitanium
  );
  midTiRing.position.set(0, 0, -0.045);
  midBarrelGroup.add(midTiRing);

  const midAmberRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.0508, 0.0006, 12, 64),
    amberAccent
  );
  midAmberRing.position.set(0, 0, -0.075);
  midBarrelGroup.add(midAmberRing);

  const contactPadGeo = new THREE.BoxGeometry(0.008, 0.016, 0.003);
  const contactPad = new THREE.Mesh(contactPadGeo, blackAnodized);
  contactPad.position.set(0, 0.0505, -0.060);
  midBarrelGroup.add(contactPad);

  for (let p = 0; p < 4; p++) {
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0008, 0.0008, 0.002, 12),
      amberAccent
    );
    pin.rotation.x = Math.PI / 2;
    pin.position.set(-0.0024 + p * 0.0016, 0.0515, -0.060);
    midBarrelGroup.add(pin);
  }

  presentationRoot.add(midBarrelGroup);

  // 8. Rear Optics
  const rearOpticsGroup = new THREE.Group();
  rearOpticsGroup.name = "RearOpticsGroup";
  rearOpticsGroup.userData = { componentId: "rear_optics" };

  const rearGlassGeo = new THREE.SphereGeometry(0.032, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.28);
  rearGlassGeo.rotateX(Math.PI);
  const rearGlass = new THREE.Mesh(rearGlassGeo, internalOpticalGlass);
  rearGlass.position.set(0, 0, -0.068);
  rearOpticsGroup.add(rearGlass);

  const rearCellGeo = new THREE.CylinderGeometry(0.035, 0.036, 0.018, 48, 1, true);
  rearCellGeo.rotateX(Math.PI / 2);
  const rearCell = new THREE.Mesh(rearCellGeo, blackAnodized);
  rearCell.position.set(0, 0, -0.062);
  rearOpticsGroup.add(rearCell);

  presentationRoot.add(rearOpticsGroup);

  // 9. Titanium PL Mount
  const plMountGroup = new THREE.Group();
  plMountGroup.name = "PLMountGroup";
  plMountGroup.userData = { componentId: "pl_mount" };

  const throatGeo = new THREE.CylinderGeometry(0.027, 0.027, 0.022, 64, 1, true);
  throatGeo.rotateX(Math.PI / 2);
  const throatMesh = new THREE.Mesh(throatGeo, stainlessSteel);
  throatMesh.position.set(0, 0, -0.098);
  plMountGroup.add(throatMesh);

  const flangeRingGeo = new THREE.CylinderGeometry(0.046, 0.047, 0.008, 64);
  flangeRingGeo.rotateX(Math.PI / 2);
  const flangeRing = new THREE.Mesh(flangeRingGeo, stainlessSteel);
  flangeRing.position.set(0, 0, -0.088);
  plMountGroup.add(flangeRing);

  for (let l = 0; l < 4; l++) {
    const lAngle = (l * Math.PI) / 2 + Math.PI / 4;
    const lugGeo = new THREE.BoxGeometry(0.008, 0.014, 0.012);
    const lug = new THREE.Mesh(lugGeo, stainlessSteel);
    lug.position.set(
      Math.cos(lAngle) * 0.044,
      Math.sin(lAngle) * 0.044,
      -0.088
    );
    lug.rotation.z = lAngle;
    plMountGroup.add(lug);
  }

  const lockCollarMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.0465, 0.0022, 12, 64),
    machinedTitanium
  );
  lockCollarMesh.position.set(0, 0, -0.080);
  plMountGroup.add(lockCollarMesh);

  presentationRoot.add(plMountGroup);

  return {
    root,
    presentationRoot,
    focusRingPivot,
    apertureRingPivot,
    internalOpticsGroup,
    bladePivots,
  };
}

/**
 * Loads the Obsidian Lens from GLB or falls back gracefully to procedural geometry.
 */
export async function loadObsidianLensController(): Promise<ObsidianLensController> {
  const loader = new GLTFLoader();
  let root: THREE.Group;
  let presentationRoot: THREE.Group;
  let focusRingPivot: THREE.Group;
  let apertureRingPivot: THREE.Group;
  let internalOpticsGroup: THREE.Group | null = null;
  const bladePivots: BladePivotData[] = [];

  try {
    const gltf = await loader.loadAsync("/models/obsidian-lens.glb");
    root = gltf.scene as THREE.Group;
    root.name = "ObsidianLensRoot";

    const presFound = root.getObjectByName("PresentationRoot") as THREE.Group;
    presentationRoot = presFound || root;

    const focusPivotFound = root.getObjectByName("FocusRingPivot") as THREE.Group;
    focusRingPivot = focusPivotFound || new THREE.Group();

    const aperturePivotFound = root.getObjectByName("ApertureRingPivot") as THREE.Group;
    apertureRingPivot = aperturePivotFound || new THREE.Group();

    internalOpticsGroup = (root.getObjectByName("InternalOpticsGroup") as THREE.Group) || null;

    // Discover 11 iris blade pivots
    for (let i = 0; i < 11; i++) {
      const p = root.getObjectByName(`IrisBladePivot_${i}`) as THREE.Group;
      if (p) {
        const baseAngle = (i * Math.PI * 2) / 11;
        bladePivots.push({ pivotGroup: p, baseAngle });
      }
    }

    // Attach component metadata to loaded objects
    root.traverse((obj) => {
      if (obj.name === "FrontBezelGroup") obj.userData = { componentId: "front_bezel" };
      if (obj.name === "FrontOpticsGroup") obj.userData = { componentId: "front_optics" };
      if (obj.name === "InternalOpticsGroup") obj.userData = { componentId: "internal_optics" };
      if (obj.name === "IrisAssemblyGroup") obj.userData = { componentId: "iris_assembly" };
      if (obj.name === "FocusRingGroup") obj.userData = { componentId: "focus_ring" };
      if (obj.name === "ApertureRingGroup") obj.userData = { componentId: "aperture_ring" };
      if (obj.name === "MidBarrelGroup") obj.userData = { componentId: "mid_barrel" };
      if (obj.name === "RearOpticsGroup") obj.userData = { componentId: "rear_optics" };
      if (obj.name === "PLMountGroup") obj.userData = { componentId: "pl_mount" };
    });
  } catch (err) {
    console.warn("Could not load /models/obsidian-lens.glb, building procedural lens fallback:", err);
    const proc = createProceduralObsidianLens();
    root = proc.root;
    presentationRoot = proc.presentationRoot;
    focusRingPivot = proc.focusRingPivot;
    apertureRingPivot = proc.apertureRingPivot;
    internalOpticsGroup = proc.internalOpticsGroup;
    bladePivots.push(...proc.bladePivots);
  }

  // Animation & Mechanical State
  let currentAperture = 0.70; // Start at T2.8 cinema sweet spot
  let targetAperture = 0.70;
  let currentFocus = 0.35; // Start at ~3 meters
  let targetFocus = 0.35;

  const OPEN_ROT = -0.42;  // Wide Open (T1.5)
  const CLOSED_ROT = 0.38; // Stopped down (T22)
  const MAX_FOCUS_ROT = Math.PI * 1.5; // 270 degrees

  // Apply initial positions
  const updateBlades = (openness: number) => {
    // Smootherstep interpolation for authentic physical blade travel
    const t = THREE.MathUtils.clamp(openness, 0, 1);
    const eased = t * t * t * (t * (t * 6 - 15) + 10);
    const rot = THREE.MathUtils.lerp(CLOSED_ROT, OPEN_ROT, eased);

    for (const b of bladePivots) {
      b.pivotGroup.rotation.z = b.baseAngle + rot;
    }

    if (apertureRingPivot) {
      apertureRingPivot.rotation.z = (1 - eased) * 1.1; // Rotates T-stop scale across witness mark
    }
  };

  const updateFocus = (focus: number) => {
    const clamped = THREE.MathUtils.clamp(focus, 0, 1);
    if (focusRingPivot) {
      focusRingPivot.rotation.z = clamped * MAX_FOCUS_ROT;
    }
    // Subtle internal floating element translation along optical axis
    if (internalOpticsGroup) {
      internalOpticsGroup.position.z = (1 - clamped) * 0.0035;
    }
  };

  updateBlades(currentAperture);
  updateFocus(currentFocus);

  return {
    root,
    presentationRoot,
    focusRingPivot,
    apertureRingPivot,
    internalOpticsGroup,
    bladePivots,

    setAperture(value: number) {
      targetAperture = THREE.MathUtils.clamp(value, 0, 1);
    },
    getAperture() {
      return currentAperture;
    },
    setFocus(value: number) {
      targetFocus = THREE.MathUtils.clamp(value, 0, 1);
    },
    getFocus() {
      return currentFocus;
    },

    getHoveredComponent(raycaster: THREE.Raycaster): ObsidianComponent | null {
      const hits = raycaster.intersectObjects(root.children, true);
      for (const hit of hits) {
        let curr: THREE.Object3D | null = hit.object;
        while (curr && curr !== root) {
          const compId = curr.userData?.componentId;
          if (compId && OBSIDIAN_COMPONENTS[compId]) {
            return OBSIDIAN_COMPONENTS[compId];
          }
          curr = curr.parent;
        }
      }
      return null;
    },

    update(deltaSeconds: number, _animate: boolean, reducedMotion: boolean) {
      const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);

      if (reducedMotion) {
        currentAperture = targetAperture;
        currentFocus = targetFocus;
      } else {
        currentAperture = THREE.MathUtils.damp(currentAperture, targetAperture, 11, dt);
        currentFocus = THREE.MathUtils.damp(currentFocus, targetFocus, 10, dt);
      }

      updateBlades(currentAperture);
      updateFocus(currentFocus);
    },

    dispose() {
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    },
  };
}


import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSEMBLY_CONFIG, CameraPartConfig } from "./assembly-config";

export interface PreparedPart {
  config: CameraPartConfig;
  object: THREE.Object3D;
  assembledPosition: THREE.Vector3;
  originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
}

export interface CameraAssemblyController {
  root: THREE.Group;
  parts: PreparedPart[];
  focusRing: THREE.Object3D | null;
  focusStartRot: number;
  bladePivots: { object: THREE.Object3D; baseAngle: number }[];
  setAssembly: (value: number) => void;
  getAssembly: () => number;
  setHighlightedPart: (name: string | null) => void;
  getHoveredComponent: (raycaster: THREE.Raycaster) => CameraPartConfig | null;
  update: (deltaSeconds: number, animate: boolean, reducedMotion: boolean) => void;
  dispose: () => void;
}

/**
 * Procedural Fallback Builder for the Cinema Camera Assembly.
 * Matches the public/models/cinema-engine.glb structure 1:1, ensuring
 * resilient instant loading under any network condition.
 */
function createProceduralCinemaCamera(): THREE.Group {
  const root = new THREE.Group();
  root.name = "CinemaAssembly";

  const graphiteMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#16181D"),
    metalness: 0.38,
    roughness: 0.55,
    name: "GraphiteBody",
  });

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#68707C"),
    metalness: 0.88,
    roughness: 0.24,
    name: "MachinedTitanium",
  });

  const blackAnodizedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0E0F12"),
    metalness: 0.65,
    roughness: 0.35,
    name: "BlackAnodized",
  });

  const amberRingMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#E9B457"),
    emissive: new THREE.Color("#3D290A"),
    emissiveIntensity: 0.42,
    metalness: 0.78,
    roughness: 0.28,
    name: "AmberAccent",
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#D4EAF6"),
    metalness: 0.08,
    roughness: 0.04,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    name: "OpticalGlass",
  });

  const sensorMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#16322C"),
    emissive: new THREE.Color("#0A1C18"),
    emissiveIntensity: 0.2,
    metalness: 0.92,
    roughness: 0.12,
    name: "OLPFSensor",
  });

  const bladeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#20232A"),
    metalness: 0.75,
    roughness: 0.38,
    name: "ApertureBladeSteel",
  });

  const displayMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#07090C"),
    emissive: new THREE.Color("#1A2B28"),
    emissiveIntensity: 0.35,
    metalness: 0.8,
    roughness: 0.2,
    name: "StatusDisplay",
  });

  // 1. Camera Body
  const cameraBody = new THREE.Group();
  cameraBody.name = "CameraBody";
  cameraBody.position.set(0, 0, -0.8);

  const chassisGeo = new THREE.BoxGeometry(1.45, 1.35, 1.55);
  const chassisMesh = new THREE.Mesh(chassisGeo, graphiteMat);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  cameraBody.add(chassisMesh);

  const sensorPlateGeo = new THREE.CylinderGeometry(0.58, 0.62, 0.14, 32);
  sensorPlateGeo.rotateX(Math.PI / 2);
  const sensorPlate = new THREE.Mesh(sensorPlateGeo, titaniumMat);
  sensorPlate.position.set(0, 0, 0.84);
  cameraBody.add(sensorPlate);

  const sensorCavityGeo = new THREE.BoxGeometry(0.55, 0.38, 0.04);
  const sensorMesh = new THREE.Mesh(sensorCavityGeo, sensorMat);
  sensorMesh.position.set(0, 0, 0.88);
  cameraBody.add(sensorMesh);

  const cheesePlateGeo = new THREE.BoxGeometry(1.25, 0.08, 1.4);
  const cheesePlate = new THREE.Mesh(cheesePlateGeo, blackAnodizedMat);
  cheesePlate.position.set(0, 0.71, 0);
  cameraBody.add(cheesePlate);

  const handlePillar1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.14), titaniumMat);
  handlePillar1.position.set(0, 0.88, -0.4);
  const handlePillar2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.14), titaniumMat);
  handlePillar2.position.set(0, 0.88, 0.35);
  const handleGrip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 1.15), blackAnodizedMat);
  handleGrip.position.set(0, 1.05, 0);
  cameraBody.add(handlePillar1);
  cameraBody.add(handlePillar2);
  cameraBody.add(handleGrip);

  const rodClamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.28), blackAnodizedMat);
  rodClamp.position.set(0, -0.72, 0.4);
  cameraBody.add(rodClamp);

  const rodGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.2, 16);
  rodGeo.rotateX(Math.PI / 2);
  const leftRod = new THREE.Mesh(rodGeo, titaniumMat);
  leftRod.position.set(-0.35, -0.72, 0.55);
  const rightRod = new THREE.Mesh(rodGeo, titaniumMat);
  rightRod.position.set(0.35, -0.72, 0.55);
  cameraBody.add(leftRod);
  cameraBody.add(rightRod);

  const displayBezel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.95), blackAnodizedMat);
  displayBezel.position.set(-0.74, 0.05, -0.05);
  const displayScreen = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.62, 0.82), displayMat);
  displayScreen.position.set(-0.76, 0.05, -0.05);
  cameraBody.add(displayBezel);
  cameraBody.add(displayScreen);

  const mediaDoor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.75), titaniumMat);
  mediaDoor.position.set(0.74, 0.05, -0.15);
  cameraBody.add(mediaDoor);

  for (let i = 0; i < 5; i++) {
    const ventLouver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.6), blackAnodizedMat);
    ventLouver.position.set(0.74, -0.35 - i * 0.06, -0.15);
    ventLouver.rotation.z = 0.2;
    cameraBody.add(ventLouver);
  }

  const batteryPlate = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 0.12), blackAnodizedMat);
  batteryPlate.position.set(0, 0, -0.83);
  cameraBody.add(batteryPlate);

  root.add(cameraBody);

  // 2. Lens Mount
  const lensMount = new THREE.Group();
  lensMount.name = "LensMount";
  lensMount.position.set(0, 0, 0.05);

  const flangeGeo = new THREE.CylinderGeometry(0.56, 0.58, 0.12, 36);
  flangeGeo.rotateX(Math.PI / 2);
  const flangeMesh = new THREE.Mesh(flangeGeo, titaniumMat);
  lensMount.add(flangeMesh);

  const lockCollarGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.18, 36);
  lockCollarGeo.rotateX(Math.PI / 2);
  const lockCollar = new THREE.Mesh(lockCollarGeo, blackAnodizedMat);
  lockCollar.position.set(0, 0, 0.08);
  lensMount.add(lockCollar);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const wingGeo = new THREE.BoxGeometry(0.08, 0.14, 0.15);
    const wing = new THREE.Mesh(wingGeo, titaniumMat);
    wing.position.set(Math.cos(angle) * 0.52, Math.sin(angle) * 0.52, 0.08);
    wing.rotation.z = angle;
    lensMount.add(wing);
  }

  for (let i = 0; i < 4; i++) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12), amberRingMat);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(-0.25 + i * 0.08, 0.35, 0.12);
    lensMount.add(pin);
  }

  root.add(lensMount);

  // 3. Rear Optics
  const rearOptics = new THREE.Group();
  rearOptics.name = "RearOptics";
  rearOptics.position.set(0, 0, 0.28);

  const rearCellGeo = new THREE.CylinderGeometry(0.44, 0.46, 0.18, 36, 1, true);
  rearCellGeo.rotateX(Math.PI / 2);
  const rearCell = new THREE.Mesh(rearCellGeo, blackAnodizedMat);
  rearOptics.add(rearCell);

  const rearThreadRing = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.02, 16, 36), titaniumMat);
  rearThreadRing.position.set(0, 0, 0.08);
  rearOptics.add(rearThreadRing);

  const rearGlassGeo = new THREE.SphereGeometry(0.41, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.32);
  rearGlassGeo.rotateX(Math.PI);
  const rearGlass = new THREE.Mesh(rearGlassGeo, glassMat);
  rearGlass.position.set(0, 0, 0.02);
  rearOptics.add(rearGlass);

  const baffle = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.42, 32), blackAnodizedMat);
  baffle.position.set(0, 0, -0.04);
  rearOptics.add(baffle);

  root.add(rearOptics);

  // 4. Iris Assembly
  const irisAssembly = new THREE.Group();
  irisAssembly.name = "IrisAssembly";
  irisAssembly.position.set(0, 0, 0.52);

  const irisHousingGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.12, 36);
  irisHousingGeo.rotateX(Math.PI / 2);
  const irisHousing = new THREE.Mesh(irisHousingGeo, blackAnodizedMat);
  irisAssembly.add(irisHousing);

  const amberIrisRing = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.015, 12, 36), amberRingMat);
  amberIrisRing.position.set(0, 0, 0.05);
  irisAssembly.add(amberIrisRing);

  const numBlades = 9;
  for (let b = 0; b < numBlades; b++) {
    const bladeAngle = (b * Math.PI * 2) / numBlades;
    const bladePivot = new THREE.Group();
    bladePivot.name = `IrisBladePivot_${b}`;
    bladePivot.position.set(Math.cos(bladeAngle) * 0.32, Math.sin(bladeAngle) * 0.32, 0);
    bladePivot.rotation.z = bladeAngle;

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.quadraticCurveTo(0.18, 0.08, 0.34, 0.22);
    bladeShape.lineTo(0.28, 0.28);
    bladeShape.quadraticCurveTo(0.12, 0.15, -0.05, 0.08);
    bladeShape.closePath();

    const bladeGeo = new THREE.ShapeGeometry(bladeShape);
    const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    bladeMesh.name = `IrisBlade_${b}`;
    bladeMesh.position.set(0, 0, (b - 4.5) * 0.003);
    bladePivot.add(bladeMesh);

    irisAssembly.add(bladePivot);
  }

  root.add(irisAssembly);

  // 5. Focus Ring
  const focusRing = new THREE.Group();
  focusRing.name = "FocusRing";
  focusRing.position.set(0, 0, 0.72);

  const focusBarrelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.24, 48);
  focusBarrelGeo.rotateX(Math.PI / 2);
  const focusBarrel = new THREE.Mesh(focusBarrelGeo, blackAnodizedMat);
  focusRing.add(focusBarrel);

  const numTeeth = 44;
  for (let t = 0; t < numTeeth; t++) {
    const toothAngle = (t * Math.PI * 2) / numTeeth;
    const toothGeo = new THREE.BoxGeometry(0.024, 0.035, 0.16);
    const tooth = new THREE.Mesh(toothGeo, titaniumMat);
    tooth.position.set(Math.cos(toothAngle) * 0.53, Math.sin(toothAngle) * 0.53, -0.02);
    tooth.rotation.z = toothAngle;
    focusRing.add(tooth);
  }

  const scaleRing = new THREE.Mesh(new THREE.CylinderGeometry(0.505, 0.505, 0.06, 36), titaniumMat);
  scaleRing.rotation.x = Math.PI / 2;
  scaleRing.position.set(0, 0, 0.08);
  focusRing.add(scaleRing);

  const witnessMark = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.06), amberRingMat);
  witnessMark.position.set(0, 0.51, 0.08);
  focusRing.add(witnessMark);

  root.add(focusRing);

  // 6. Front Optics
  const frontOptics = new THREE.Group();
  frontOptics.name = "FrontOptics";
  frontOptics.position.set(0, 0, 0.96);

  const frontCellGeo = new THREE.CylinderGeometry(0.56, 0.54, 0.22, 48, 1, true);
  frontCellGeo.rotateX(Math.PI / 2);
  const frontCell = new THREE.Mesh(frontCellGeo, blackAnodizedMat);
  frontOptics.add(frontCell);

  const frontGlassGeo = new THREE.SphereGeometry(0.52, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.35);
  frontGlassGeo.rotateX(Math.PI / 2);
  const frontGlass = new THREE.Mesh(frontGlassGeo, glassMat);
  frontGlass.position.set(0, 0, 0.05);
  frontOptics.add(frontGlass);

  const secondaryGlassGeo = new THREE.SphereGeometry(0.45, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.28);
  secondaryGlassGeo.rotateX(-Math.PI / 2);
  const secondaryGlass = new THREE.Mesh(secondaryGlassGeo, glassMat);
  secondaryGlass.position.set(0, 0, -0.04);
  frontOptics.add(secondaryGlass);

  const frontAmberTorus = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.016, 16, 48), amberRingMat);
  frontAmberTorus.position.set(0, 0, 0.1);
  frontOptics.add(frontAmberTorus);

  root.add(frontOptics);

  // 7. Front Ring
  const frontRing = new THREE.Group();
  frontRing.name = "FrontRing";
  frontRing.position.set(0, 0, 1.22);

  const frontRingGeo = new THREE.CylinderGeometry(0.60, 0.58, 0.16, 48, 1, true);
  frontRingGeo.rotateX(Math.PI / 2);
  const frontRingMesh = new THREE.Mesh(frontRingGeo, blackAnodizedMat);
  frontRing.add(frontRingMesh);

  const threadRing = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.018, 16, 48), titaniumMat);
  threadRing.position.set(0, 0, 0.07);
  frontRing.add(threadRing);

  const notch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.14), titaniumMat);
  notch.position.set(0, 0.60, 0.02);
  frontRing.add(notch);

  root.add(frontRing);

  return root;
}

/**
 * Loads the camera model (from GLB or procedural builder) and sets up
 * the interactive assembly controller.
 */
export async function createCameraAssembly(
  modelUrl = "/models/cinema-engine.glb",
): Promise<CameraAssemblyController> {
  const loader = new GLTFLoader();
  let root: THREE.Group;

  try {
    const gltf = await loader.loadAsync(modelUrl);
    root = (gltf.scene.getObjectByName("CinemaAssembly") as THREE.Group) || gltf.scene;
  } catch (err) {
    console.warn("[Cinema Engine] GLB fetch fallback to procedural assembly:", err);
    root = createProceduralCinemaCamera();
  }

  // Optical separation axis is local +Z
  const opticalAxis = new THREE.Vector3(0, 0, 1);

  // Prepare configured parts
  const parts: PreparedPart[] = [];
  for (const config of ASSEMBLY_CONFIG) {
    const object = root.getObjectByName(config.name);
    if (object) {
      const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
      object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          originalMaterials.set(mesh, mesh.material);
        }
      });

      parts.push({
        config,
        object,
        assembledPosition: object.position.clone(),
        originalMaterials,
      });
    }
  }

  // Focus ring
  const focusRing = root.getObjectByName("FocusRing") || null;
  const focusStartRot = focusRing?.rotation.z ?? 0;

  // Aperture blade pivots
  const bladePivots: { object: THREE.Object3D; baseAngle: number }[] = [];
  root.traverse((child) => {
    if (child.name && child.name.startsWith("IrisBladePivot_")) {
      bladePivots.push({
        object: child,
        baseAngle: child.rotation.z,
      });
    }
  });

  // State
  let targetAssembly = 0.35;
  let currentAssembly = 0.35;
  let ambientTime = 0;
  let highlightedPartName: string | null = null;

  // Highlight material: warm amber glow on edges and surfaces
  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#E9B457"),
    emissive: new THREE.Color("#6A4918"),
    emissiveIntensity: 0.65,
    metalness: 0.7,
    roughness: 0.25,
  });

  const controller: CameraAssemblyController = {
    root,
    parts,
    focusRing,
    focusStartRot,
    bladePivots,

    setAssembly(value: number) {
      targetAssembly = THREE.MathUtils.clamp(value, 0, 1);
    },

    getAssembly() {
      return currentAssembly;
    },

    setHighlightedPart(name: string | null) {
      if (highlightedPartName === name) return;
      highlightedPartName = name;

      // Restore all original materials
      for (const part of parts) {
        for (const [mesh, origMat] of part.originalMaterials.entries()) {
          mesh.material = origMat;
        }
      }

      // If a part is highlighted, apply subtle accent highlight
      if (name) {
        const found = parts.find((p) => p.config.name === name);
        if (found) {
          for (const mesh of found.originalMaterials.keys()) {
            // Apply highlight only to non-glass meshes to avoid destroying transparency
            const origMat = found.originalMaterials.get(mesh);
            const isGlass =
              origMat &&
              !Array.isArray(origMat) &&
              (origMat.transparent || (origMat as THREE.MeshStandardMaterial).opacity < 0.9);
            if (!isGlass) {
              mesh.material = highlightMaterial;
            }
          }
        }
      }
    },

    getHoveredComponent(raycaster: THREE.Raycaster): CameraPartConfig | null {
      const hits = raycaster.intersectObjects(root.children, true);
      if (hits.length === 0) return null;

      // Traverse up from the hit mesh to find the component root
      let current: THREE.Object3D | null = hits[0].object;
      while (current && current !== root) {
        const match = parts.find((p) => p.object === current);
        if (match) {
          return match.config;
        }
        current = current.parent;
      }
      return null;
    },

    update(deltaSeconds: number, animate: boolean, reducedMotion: boolean) {
      const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);

      currentAssembly = reducedMotion
        ? targetAssembly
        : THREE.MathUtils.damp(currentAssembly, targetAssembly, 9, dt);

      // Separate parts along local optical axis (+Z)
      for (const part of parts) {
        part.object.position
          .copy(part.assembledPosition)
          .addScaledVector(opticalAxis, part.config.distance * currentAssembly);
      }

      // Ambient motion (focus ring drift and aperture pulsation)
      if (animate && !reducedMotion) {
        ambientTime += dt;
      }

      if (focusRing) {
        focusRing.rotation.z = focusStartRot + Math.sin(ambientTime * 0.45) * 0.055;
      }

      // Articulate iris blades
      if (bladePivots.length > 0) {
        const bladeWobble = Math.sin(ambientTime * 0.38) * 0.12 * (1 - currentAssembly * 0.4);
        for (const bp of bladePivots) {
          bp.object.rotation.z = bp.baseAngle + bladeWobble;
        }
      }
    },

    dispose() {
      highlightMaterial.dispose();
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          if (mesh.geometry) mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });
    },
  };

  return controller;
}


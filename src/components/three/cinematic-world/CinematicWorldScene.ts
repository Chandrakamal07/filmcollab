import * as THREE from "three";

export interface CinematicLayerData {
  group: THREE.Group;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  baseQuaternion: THREE.Quaternion;
  composedPosition: THREE.Vector3;
  composedRotation: THREE.Euler;
  composedQuaternion: THREE.Quaternion;
  ampX: number;
  ampY: number;
  ampZ: number;
  ampRotY: number;
  phaseOffset: number;
}

export interface CinematicWorldController {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  layers: CinematicLayerData[];
  lightBeam: THREE.Mesh | null;
  sweepLight: THREE.PointLight | null;
  update: (deltaSeconds: number, isRunning: boolean, pointer: THREE.Vector2, isMobile: boolean) => void;
  dispose: () => void;
  isReady: () => boolean;
  getActiveTime: () => number;
}

export function applyCoverCrop(
  texture: THREE.Texture,
  imageWidth: number,
  imageHeight: number,
  planeWidth: number,
  planeHeight: number,
  alignX: number = 0.5,
  alignY: number = 0.5
) {
  const imageAspect = imageWidth / imageHeight;
  const planeAspect = planeWidth / planeHeight;

  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);

  if (imageAspect > planeAspect) {
    texture.repeat.x = planeAspect / imageAspect;
    texture.offset.x = (1 - texture.repeat.x) * alignX;
  } else {
    texture.repeat.y = imageAspect / planeAspect;
    texture.offset.y = (1 - texture.repeat.y) * alignY;
  }

  texture.needsUpdate = true;
}

interface ImageConfig {
  path: string;
  width: number;
  height: number;
  imgWidth: number;
  imgHeight: number;
  cropX: number;
  cropY: number;
  basePos: THREE.Vector3;
  baseRot: THREE.Euler;
  composedPos: THREE.Vector3;
  composedRot: THREE.Euler;
  ampX: number;
  ampY: number;
  ampZ: number;
  ampRotY: number;
  phaseOffset: number;
}

const IMAGE_CONFIGS: ImageConfig[] = [
  // 1. Clapperboard on Film Set (Anchor Image)
  {
    path: "/images/hero/frame-main.jpg",
    width: 2.8,
    height: 1.58,
    imgWidth: 1200,
    imgHeight: 811,
    cropX: 0.5,
    cropY: 0.5,
    basePos: new THREE.Vector3(2.0, -0.05, -1.0),
    baseRot: new THREE.Euler(0.02, -0.15, -0.01),
    composedPos: new THREE.Vector3(2.2, -0.12, -0.9),
    composedRot: new THREE.Euler(0.0, -0.09, 0.0),
    ampX: 0.12,
    ampY: 0.06,
    ampZ: 0.12,
    ampRotY: 0.03,
    phaseOffset: 0.0,
  },
  // 2. Central Cinema Neon Theater Facade (Lower Right Accent)
  {
    path: "/images/hero/frame-supporting-2.jpg",
    width: 2.0,
    height: 1.25,
    imgWidth: 1000,
    imgHeight: 800,
    cropX: 0.5,
    cropY: 0.5,
    basePos: new THREE.Vector3(3.1, -0.72, -0.5),
    baseRot: new THREE.Euler(-0.02, -0.22, 0.02),
    composedPos: new THREE.Vector3(2.85, -0.68, -0.6),
    composedRot: new THREE.Euler(0.0, -0.11, 0.0),
    ampX: -0.12,
    ampY: 0.07,
    ampZ: -0.14,
    ampRotY: -0.04,
    phaseOffset: Math.PI * 0.5,
  },
  // 3. Studio Stage Lighting Fixture (Upper Left-Center Depth)
  {
    path: "/images/hero/frame-supporting-1.jpg",
    width: 2.1,
    height: 1.25,
    imgWidth: 1000,
    imgHeight: 667,
    cropX: 0.5,
    cropY: 0.5,
    basePos: new THREE.Vector3(1.4, 0.95, -2.0),
    baseRot: new THREE.Euler(0.03, -0.09, 0.01),
    composedPos: new THREE.Vector3(1.7, 0.78, -1.6),
    composedRot: new THREE.Euler(0.0, -0.07, 0.0),
    ampX: 0.10,
    ampY: -0.05,
    ampZ: 0.12,
    ampRotY: 0.03,
    phaseOffset: Math.PI * 1.0,
  },
  // 4. Mist-Shrouded Castle Vista Portrait (Upper Right Anchor)
  {
    path: "/images/hero/frame-4.jpg",
    width: 1.35,
    height: 1.75,
    imgWidth: 1000,
    imgHeight: 1513,
    cropX: 0.5,
    cropY: 0.35,
    basePos: new THREE.Vector3(3.3, 0.78, -1.4),
    baseRot: new THREE.Euler(0.01, -0.25, -0.02),
    composedPos: new THREE.Vector3(3.15, 0.65, -1.2),
    composedRot: new THREE.Euler(0.0, -0.13, 0.0),
    ampX: -0.09,
    ampY: -0.06,
    ampZ: -0.10,
    ampRotY: -0.03,
    phaseOffset: Math.PI * 1.5,
  },
];

export function createCinematicWorldScene(
  container: HTMLElement,
  onFirstRender?: () => void,
  onError?: (err: Error) => void
): CinematicWorldController {
  const width = container.clientWidth || window.innerWidth || 1200;
  const height = container.clientHeight || 700;

  let disposed = false;
  let essentialTexturesReady = false;
  let hasReportedFirstRender = false;

  // Deduplicated resource tracking sets for clean disposal
  const ownedGeometries = new Set<THREE.BufferGeometry>();
  const ownedMaterials = new Set<THREE.Material>();
  const ownedTextures = new Set<THREE.Texture>();

  // 1. WebGL Renderer
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.pointerEvents = "none";
  container.appendChild(renderer.domElement);

  // 2. Scene & Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
  const baseCamPos = new THREE.Vector3(0.0, 0.0, 6.0);
  camera.position.copy(baseCamPos);
  const cameraTarget = new THREE.Vector3(0.5, 0.0, 0.0);
  camera.lookAt(cameraTarget);

  // 3. Restrained Atmospheric Lighting
  const sweepLight = new THREE.PointLight("#FFE0B2", 1.2, 7.0, 1.4);
  sweepLight.position.set(2.4, 1.2, 0.2);
  scene.add(sweepLight);

  // 4. Soft Volumetric Anamorphic Light Beam
  const beamLength = 8.5;
  const beamRadiusTop = 0.25;
  const beamRadiusBottom = 2.0;
  const beamGeo = new THREE.CylinderGeometry(beamRadiusTop, beamRadiusBottom, beamLength, 32, 1, true);
  beamGeo.translate(0, -beamLength / 2, 0);
  ownedGeometries.add(beamGeo);

  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color("#FFAE4E") },
      uOpacity: { value: 0.07 },
      uPhase: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uPhase;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        float lengthFade = smoothstep(0.02, 0.20, vUv.y) * (1.0 - smoothstep(0.70, 0.98, vUv.y));
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float rim = abs(dot(viewDir, normal));
        float softRim = pow(1.0 - rim, 0.8) * 0.8 + rim * 0.2;
        // Integer harmonic shimmer over 20-second loop (period 2*pi)
        float shimmer = 0.96 + 0.04 * sin(vUv.y * 18.0 - uPhase);
        gl_FragColor = vec4(uColor, uOpacity * lengthFade * softRim * shimmer);
      }
    `,
  });
  ownedMaterials.add(beamMat);

  const lightBeam = new THREE.Mesh(beamGeo, beamMat);
  lightBeam.position.set(3.4, 3.2, 0.0);
  lightBeam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(-0.65, -0.65, -0.38).normalize()
  );
  scene.add(lightBeam);

  // 5. Tracked Asynchronous Texture Loading
  const textureLoader = new THREE.TextureLoader();

  async function loadOwnedTexture(url: string): Promise<THREE.Texture> {
    const texture = await textureLoader.loadAsync(url);
    if (disposed) {
      texture.dispose();
      throw new Error("Scene disposed during texture loading");
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    ownedTextures.add(texture);
    return texture;
  }

  // Dark backing material placed strictly BEHIND each image
  const carbonBackMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#08090C"),
    side: THREE.FrontSide,
    depthTest: true,
    depthWrite: true,
  });
  ownedMaterials.add(carbonBackMat);

  const layers: CinematicLayerData[] = [];
  const thickness = 0.006;
  const imageZ = 0.001;

  Promise.all(
    IMAGE_CONFIGS.map(async (config) => {
      const texture = await loadOwnedTexture(config.path);
      if (disposed) return null;

      applyCoverCrop(
        texture,
        config.imgWidth,
        config.imgHeight,
        config.width,
        config.height,
        config.cropX,
        config.cropY
      );

      const group = new THREE.Group();

      // Front photograph (unlit, luminous, toneMapped false)
      const photoMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
        side: THREE.FrontSide,
        depthTest: true,
        depthWrite: true,
      });
      ownedMaterials.add(photoMaterial);

      const photoGeo = new THREE.PlaneGeometry(config.width, config.height);
      ownedGeometries.add(photoGeo);

      const photoPlane = new THREE.Mesh(photoGeo, photoMaterial);
      photoPlane.position.z = imageZ;
      group.add(photoPlane);

      // Backing slab located entirely behind image: front face at z = 0
      const backingGeo = new THREE.BoxGeometry(config.width + 0.012, config.height + 0.012, thickness);
      ownedGeometries.add(backingGeo);

      const backing = new THREE.Mesh(backingGeo, carbonBackMat);
      backing.position.z = -thickness / 2;
      group.add(backing);

      group.position.copy(config.basePos);
      group.rotation.copy(config.baseRot);
      scene.add(group);

      const baseQuat = new THREE.Quaternion().setFromEuler(config.baseRot);
      const compQuat = new THREE.Quaternion().setFromEuler(config.composedRot);

      return {
        group,
        basePosition: config.basePos.clone(),
        baseRotation: config.baseRot.clone(),
        baseQuaternion: baseQuat,
        composedPosition: config.composedPos.clone(),
        composedRotation: config.composedRot.clone(),
        composedQuaternion: compQuat,
        ampX: config.ampX,
        ampY: config.ampY,
        ampZ: config.ampZ,
        ampRotY: config.ampRotY,
        phaseOffset: config.phaseOffset,
      } as CinematicLayerData;
    })
  )
    .then((loadedLayers) => {
      if (disposed) return;
      for (const l of loadedLayers) {
        if (l) layers.push(l);
      }
      essentialTexturesReady = true;
    })
    .catch((err) => {
      console.error("[CinematicWorld] Texture loading failed:", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    });

  // 6. Time & Cycle Animation State
  let activeTime = 0;
  const cycleDuration = 20.0; // 20-second continuous periodic loop

  const update = (
    deltaSeconds: number,
    isRunning: boolean,
    pointer: THREE.Vector2,
    isMobile: boolean
  ) => {
    if (disposed) return;

    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
    if (isRunning) {
      activeTime += dt;
    }

    // 20-second continuous periodic phase in [0, 2pi)
    const phase = ((activeTime % cycleDuration) / cycleDuration) * Math.PI * 2;

    // Coordinated Convergence Weight: smooth cubic wave holding alignment at peak
    const convergence = Math.pow((1 - Math.cos(phase)) / 2, 3);
    const wanderDamp = 1.0 - convergence * 0.75;

    // A. Update Layer Motion
    for (const layer of layers) {
      // 1. Interpolate between base and composed transforms
      layer.group.position.lerpVectors(layer.basePosition, layer.composedPosition, convergence);
      layer.group.quaternion.slerpQuaternions(layer.baseQuaternion, layer.composedQuaternion, convergence);

      // 2. Add harmonic ambient drift using integer multipliers only
      const pOff = layer.phaseOffset;
      const driftX = Math.sin(phase + pOff) * layer.ampX * wanderDamp;
      const driftY = Math.cos(phase + pOff) * layer.ampY * wanderDamp;
      const driftZ = Math.sin(2 * phase + pOff) * layer.ampZ * wanderDamp;
      const driftRotY = Math.sin(phase + pOff) * layer.ampRotY * wanderDamp;

      layer.group.position.x += driftX;
      layer.group.position.y += driftY;
      layer.group.position.z += driftZ;

      // Apply subtle extra Y rotation wander
      const qDrift = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), driftRotY);
      layer.group.quaternion.multiply(qDrift);
    }

    // B. Pointer Parallax
    const parallaxX = pointer.x * (isMobile ? 0.08 : 0.20);
    const parallaxY = pointer.y * (isMobile ? 0.05 : 0.12);

    if (isMobile) {
      camera.position.set(baseCamPos.x + 0.3 + parallaxX, baseCamPos.y + 0.1 + parallaxY, 7.6);
    } else {
      camera.position.set(baseCamPos.x + parallaxX, baseCamPos.y + parallaxY, baseCamPos.z);
    }
    camera.lookAt(cameraTarget);

    // C. Atmospheric Shimmer & Sweep Light (strictly integer harmonics)
    beamMat.uniforms.uPhase.value = phase;
    sweepLight.position.x = 2.4 + Math.sin(phase) * 1.0 + pointer.x * 0.3;
    sweepLight.position.y = 1.2 + Math.cos(phase) * 0.5 + pointer.y * 0.2;

    renderer.render(scene, camera);

    if (essentialTexturesReady && !hasReportedFirstRender) {
      hasReportedFirstRender = true;
      onFirstRender?.();
    }
  };

  const dispose = () => {
    disposed = true;

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) ownedGeometries.add(mesh.geometry);
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => ownedMaterials.add(m));
        } else if (mesh.material) {
          ownedMaterials.add(mesh.material);
        }
      }
    });

    ownedGeometries.forEach((g) => g.dispose());
    ownedGeometries.clear();

    ownedMaterials.forEach((m) => m.dispose());
    ownedMaterials.clear();

    ownedTextures.forEach((t) => t.dispose());
    ownedTextures.clear();

    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    layers,
    lightBeam,
    sweepLight,
    update,
    dispose,
    isReady: () => essentialTexturesReady,
    getActiveTime: () => activeTime,
  };
}

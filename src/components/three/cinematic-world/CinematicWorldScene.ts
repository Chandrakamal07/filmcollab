import * as THREE from "three";

export interface CinematicLayerData {
  group: THREE.Group;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
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
  lightBeam: THREE.Mesh;
  sweepLight: THREE.PointLight;
  update: (deltaSeconds: number, isRunning: boolean, pointer: THREE.Vector2, isMobile: boolean) => void;
  dispose: () => void;
}

export function createCinematicWorldScene(
  container: HTMLElement,
  onFirstRender?: () => void
): CinematicWorldController {
  const width = container.clientWidth || window.innerWidth || 1200;
  const height = container.clientHeight || 700;

  // 1. WebGL Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.pointerEvents = "none";
  container.appendChild(renderer.domElement);

  // 2. Scene & Camera
  const scene = new THREE.Scene();

  // Perspective camera: 36° cinema field of view
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
  const baseCamPos = new THREE.Vector3(0.3, 0.05, 6.8);
  camera.position.copy(baseCamPos);
  const cameraTarget = new THREE.Vector3(0.5, 0.0, 0.0);
  camera.lookAt(cameraTarget);

  // 3. Cinematic Studio Lighting
  // Warm Key Light grazing from upper right
  const keyLight = new THREE.DirectionalLight("#FFF4E6", 2.2);
  keyLight.position.set(4.2, 3.8, 2.5);
  scene.add(keyLight);

  // Amber Rim Light defining photographic edges
  const amberRim = new THREE.SpotLight("#FFAA48", 3.8, 12, Math.PI / 3, 0.6, 1.2);
  amberRim.position.set(-2.4, 2.0, -1.0);
  amberRim.target.position.set(1.5, 0, -2.0);
  scene.add(amberRim);
  scene.add(amberRim.target);

  // Cool Deep Ambient
  const ambientLight = new THREE.AmbientLight("#0D1018", 0.95);
  scene.add(ambientLight);

  // Moving reflection light
  const sweepLight = new THREE.PointLight("#FFE0B2", 1.8, 8.0, 1.2);
  sweepLight.position.set(2.0, 1.5, 0.5);
  scene.add(sweepLight);

  // 4. Soft Volumetric Light Beam (Anamorphic studio shaft)
  const beamLength = 9.0;
  const beamRadiusTop = 0.35;
  const beamRadiusBottom = 2.4;
  const beamGeo = new THREE.CylinderGeometry(beamRadiusTop, beamRadiusBottom, beamLength, 32, 1, true);
  beamGeo.translate(0, -beamLength / 2, 0);

  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color("#FFAE4E") },
      uOpacity: { value: 0.11 },
      uTime: { value: 0 },
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
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        // Soft longitudinal falloff
        float lengthFade = smoothstep(0.02, 0.18, vUv.y) * (1.0 - smoothstep(0.70, 0.98, vUv.y));
        // Soft rim falloff
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float rim = abs(dot(viewDir, normal));
        float softRim = pow(1.0 - rim, 0.8) * 0.8 + rim * 0.2;
        // Subtle atmospheric shimmer
        float shimmer = 0.92 + 0.08 * sin(vUv.y * 18.0 - uTime * 0.6);
        gl_FragColor = vec4(uColor, uOpacity * lengthFade * softRim * shimmer);
      }
    `,
  });

  const lightBeam = new THREE.Mesh(beamGeo, beamMat);
  lightBeam.position.set(3.8, 3.4, 0.2);
  lightBeam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(-0.65, -0.65, -0.4).normalize()
  );
  scene.add(lightBeam);

  // 5. Texture Loader & Shared Materials
  const textureLoader = new THREE.TextureLoader();

  const graphiteBorderMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1A1D23"),
    metalness: 0.35,
    roughness: 0.55,
  });

  const titaniumBevelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#747C8A"),
    metalness: 0.88,
    roughness: 0.24,
  });

  const amberHairlineMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#E9B457"),
    emissive: new THREE.Color("#2A1C06"),
    emissiveIntensity: 0.4,
    metalness: 0.82,
    roughness: 0.28,
  });

  const carbonBackMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0E1014"),
    metalness: 0.2,
    roughness: 0.7,
  });

  // Helper to build a cinematic image surface with physical micro-framing
  function createCinematicSurface(
    imagePath: string,
    widthMeters: number,
    heightMeters: number,
    filmLabel?: string
  ): THREE.Group {
    const group = new THREE.Group();

    // Photographic Image Face
    const texture = textureLoader.load(imagePath);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;

    const photoMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.35,
      metalness: 0.08,
      side: THREE.FrontSide,
    });

    const photoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(widthMeters, heightMeters),
      photoMat
    );
    photoPlane.position.set(0, 0, 0.002);
    group.add(photoPlane);

    // Dark Backplate
    const backPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(widthMeters, heightMeters),
      carbonBackMat
    );
    backPlane.rotation.y = Math.PI;
    backPlane.position.set(0, 0, -0.002);
    group.add(backPlane);

    // Thin Graphite Surrounding Frame (15mm border)
    const bw = 0.014;
    const fw = widthMeters + bw * 2;
    const fh = heightMeters + bw * 2;

    const frameOuter = new THREE.Mesh(
      new THREE.BoxGeometry(fw, fh, 0.006),
      graphiteBorderMat
    );
    frameOuter.position.set(0, 0, 0);
    group.add(frameOuter);

    // Machined Titanium Beveled Rim
    const rimTop = new THREE.Mesh(
      new THREE.BoxGeometry(fw, 0.002, 0.007),
      titaniumBevelMat
    );
    rimTop.position.set(0, fh / 2, 0.001);
    group.add(rimTop);

    // Amber Hairline Accent on Bottom Edge
    const amberBottom = new THREE.Mesh(
      new THREE.BoxGeometry(fw * 0.85, 0.0015, 0.007),
      amberHairlineMat
    );
    amberBottom.position.set(0, -fh / 2, 0.001);
    group.add(amberBottom);

    // Restrained Optical Gauge Markings on Side
    if (filmLabel) {
      const notchGeo = new THREE.BoxGeometry(0.0015, 0.008, 0.008);
      for (let n = -2; n <= 2; n++) {
        const notch = new THREE.Mesh(notchGeo, titaniumBevelMat);
        notch.position.set(fw / 2 + 0.001, n * 0.035, 0);
        group.add(notch);
      }
    }

    return group;
  }

  // 6. Instantiate 4 Cinematic Story Fragments
  const layers: CinematicLayerData[] = [];

  // Fragment 1: The Master Landscape Horizon (2.39:1 Anamorphic)
  const frag1Group = createCinematicSurface("/images/hero/frame-main.jpg", 3.4, 1.42, "2.39:1");
  const frag1BasePos = new THREE.Vector3(1.5, 0.20, -2.2);
  const frag1BaseRot = new THREE.Euler(0.04, -0.16, -0.015);
  frag1Group.position.copy(frag1BasePos);
  frag1Group.rotation.copy(frag1BaseRot);
  scene.add(frag1Group);

  layers.push({
    group: frag1Group,
    basePosition: frag1BasePos,
    baseRotation: frag1BaseRot,
    ampX: 0.18,
    ampY: 0.10,
    ampZ: 0.25,
    ampRotY: 0.06,
    phaseOffset: 0.0,
  });

  // Fragment 2: The Character Silhouette & Set (1.85:1 Theatrical)
  const frag2Group = createCinematicSurface("/images/hero/frame-supporting-2.jpg", 2.3, 1.24, "1.85:1");
  const frag2BasePos = new THREE.Vector3(2.5, -0.70, -0.9);
  const frag2BaseRot = new THREE.Euler(-0.03, -0.24, 0.01);
  frag2Group.position.copy(frag2BasePos);
  frag2Group.rotation.copy(frag2BaseRot);
  scene.add(frag2Group);

  layers.push({
    group: frag2Group,
    basePosition: frag2BasePos,
    baseRotation: frag2BaseRot,
    ampX: -0.22,
    ampY: 0.12,
    ampZ: -0.30,
    ampRotY: -0.07,
    phaseOffset: Math.PI * 0.45,
  });

  // Fragment 3: Architectural Vista & Light (2.39:1 Anamorphic)
  const frag3Group = createCinematicSurface("/images/hero/frame-supporting-1.jpg", 2.8, 1.17, "2.39:1");
  const frag3BasePos = new THREE.Vector3(0.8, 1.15, -3.4);
  const frag3BaseRot = new THREE.Euler(0.05, 0.08, 0.02);
  frag3Group.position.copy(frag3BasePos);
  frag3Group.rotation.copy(frag3BaseRot);
  scene.add(frag3Group);

  layers.push({
    group: frag3Group,
    basePosition: frag3BasePos,
    baseRotation: frag3BaseRot,
    ampX: 0.14,
    ampY: -0.08,
    ampZ: 0.20,
    ampRotY: 0.05,
    phaseOffset: Math.PI * 1.1,
  });

  // Fragment 4: Golden-Hour Cinematic Atmosphere (1.66:1 European Wide)
  const frag4Group = createCinematicSurface("/images/hero/frame-4.jpg", 1.9, 1.14);
  const frag4BasePos = new THREE.Vector3(3.2, 0.80, -2.5);
  const frag4BaseRot = new THREE.Euler(0.02, -0.26, -0.01);
  frag4Group.position.copy(frag4BasePos);
  frag4Group.rotation.copy(frag4BaseRot);
  scene.add(frag4Group);

  layers.push({
    group: frag4Group,
    basePosition: frag4BasePos,
    baseRotation: frag4BaseRot,
    ampX: -0.15,
    ampY: -0.11,
    ampZ: -0.18,
    ampRotY: -0.05,
    phaseOffset: Math.PI * 1.65,
  });

  // 7. Time & Cycle Animation State
  let activeTime = 0;
  const cycleDuration = 20.0; // 20-second seamless ambient loop
  let hasReportedFirstRender = false;

  const update = (
    deltaSeconds: number,
    isRunning: boolean,
    pointer: THREE.Vector2,
    isMobile: boolean
  ) => {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);

    if (isRunning) {
      activeTime += dt;
    }

    // 20-second continuous periodic phase: (0 -> 2pi)
    const phase = ((activeTime % cycleDuration) / cycleDuration) * Math.PI * 2;

    // A. Update Layer Motion (Derived from base transforms with harmonic convergence)
    // Between phase ~0.8pi and 1.3pi (t ~ 8s - 13s), layers gracefully align toward a unified widescreen convergence
    const convergenceFactor = Math.sin(phase) * 0.5 + 0.5; // Smooth 0 to 1 wave

    for (const layer of layers) {
      const pOff = layer.phaseOffset;

      // Harmonic drift: X, Y, Z coordinates derived from base without cumulative drift
      const driftX = Math.sin(phase + pOff) * layer.ampX;
      const driftY = Math.cos(phase + pOff) * layer.ampY;
      const driftZ = Math.sin(phase * 0.5 + pOff) * layer.ampZ;
      const driftRotY = Math.sin(phase + pOff) * layer.ampRotY;

      // Subtle convergence alignment
      const alignCorrectionY = (0 - layer.baseRotation.y) * 0.28 * convergenceFactor;

      layer.group.position.x = layer.basePosition.x + driftX;
      layer.group.position.y = layer.basePosition.y + driftY;
      layer.group.position.z = layer.basePosition.z + driftZ;

      layer.group.rotation.x = layer.baseRotation.x;
      layer.group.rotation.y = layer.baseRotation.y + driftRotY + alignCorrectionY;
      layer.group.rotation.z = layer.baseRotation.z;
    }

    // B. Pointer Parallax (Restrained: camera shifts subtly)
    const parallaxX = pointer.x * (isMobile ? 0.15 : 0.32);
    const parallaxY = pointer.y * (isMobile ? 0.10 : 0.20);

    if (isMobile) {
      camera.position.set(baseCamPos.x + 0.2 + parallaxX, baseCamPos.y + 0.3 + parallaxY, 8.4);
    } else {
      camera.position.set(baseCamPos.x + parallaxX, baseCamPos.y + parallaxY, baseCamPos.z);
    }
    camera.lookAt(cameraTarget);

    // C. Atmospheric Light Beam Shimmer & Sweep Light Movement
    beamMat.uniforms.uTime.value = activeTime;
    sweepLight.position.x = 2.0 + Math.sin(phase) * 1.2 + pointer.x * 0.4;
    sweepLight.position.y = 1.4 + Math.cos(phase * 0.8) * 0.6 + pointer.y * 0.3;

    // Render Scene
    renderer.render(scene, camera);

    if (!hasReportedFirstRender) {
      hasReportedFirstRender = true;
      onFirstRender?.();
    }
  };

  const dispose = () => {
    beamMat.dispose();
    beamGeo.dispose();
    graphiteBorderMat.dispose();
    titaniumBevelMat.dispose();
    amberHairlineMat.dispose();
    carbonBackMat.dispose();

    scene.traverse((obj) => {
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
  };
}

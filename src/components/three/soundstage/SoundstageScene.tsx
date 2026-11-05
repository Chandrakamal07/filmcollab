import * as React from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  STATION_LIGHTING_LOOKS,
  SoundstageComponent,
  SOUNDSTAGE_COMPONENTS,
} from "./lighting-presets";
import {
  TRACK_CONFIG,
  createTrackSequence,
  TrackSequenceState,
} from "./track-controller";
import {
  createDirectorChair,
  createCameraRig,
  createDollyTrack,
  createOverheadLighting,
} from "./SoundstageModels";

export interface SoundstageSceneHandle {
  goToStation: (stationIndex: number) => void;
  resetSequence: () => void;
  getInitCount: () => number;
}

export interface SoundstageSceneProps {
  isPaused: boolean;
  reducedMotion?: boolean;
  activeStationIndex: number;
  onStationChange: (stationIndex: number, phase: "travel" | "dwell", label: string) => void;
  onHoverComponent: (component: SoundstageComponent | null) => void;
  onReady: () => void;
}

// Deduplicated disposal helper for Three.js objects
function disposeOwnedObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) geometries.add(child.geometry);
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => materials.add(m));
        } else {
          materials.add(child.material);
        }
      }
    }
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => {
    for (const key of Object.keys(m)) {
      const val = (m as unknown as Record<string, unknown>)[key];
      if (val && typeof val === "object" && "isTexture" in val && (val as THREE.Texture).isTexture) {
        textures.add(val as THREE.Texture);
      }
    }
    m.dispose();
  });
  textures.forEach((t) => t.dispose());
}

export const SoundstageScene = React.forwardRef<SoundstageSceneHandle, SoundstageSceneProps>(
  (
    {
      isPaused,
      reducedMotion = false,
      activeStationIndex,
      onStationChange,
      onHoverComponent,
      onReady,
    },
    ref
  ) => {
    const mountRef = React.useRef<HTMLDivElement | null>(null);

    // Lifecycle counter for stability verification
    const initCounterRef = React.useRef(0);

    // Synchronize callbacks in mutable ref
    const callbacksRef = React.useRef({
      onStationChange,
      onHoverComponent,
      onReady,
    });

    React.useLayoutEffect(() => {
      callbacksRef.current = {
        onStationChange,
        onHoverComponent,
        onReady,
      };
    }, [onStationChange, onHoverComponent, onReady]);

    // Synchronize mutable props in ref
    const propsRef = React.useRef({
      isPaused,
      reducedMotion,
      activeStationIndex,
    });

    React.useEffect(() => {
      propsRef.current = {
        isPaused,
        reducedMotion,
        activeStationIndex,
      };
    }, [isPaused, reducedMotion, activeStationIndex]);

    // Track sequence control handles
    const sequenceActionsRef = React.useRef<{
      goToStation: ((index: number) => void) | null;
      resetSequence: (() => void) | null;
    }>({
      goToStation: null,
      resetSequence: null,
    });

    React.useImperativeHandle(ref, () => ({
      goToStation: (index: number) => {
        sequenceActionsRef.current.goToStation?.(index);
      },
      resetSequence: () => {
        sequenceActionsRef.current.resetSequence?.();
      },
      getInitCount: () => initCounterRef.current,
    }));

    // Main initialization effect: empty dependency array so ONE scene instance is owned
    React.useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      initCounterRef.current++;
      let disposed = false;

      let width = container.clientWidth || 800;
      let height = container.clientHeight || 500;

      // 1. Scene, Camera, Renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#08090C");
      scene.fog = new THREE.FogExp2(new THREE.Color("#08090C"), 0.025);

      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        });
      } catch (err) {
        console.warn("Soundstage WebGL initialization failed:", err);
        return;
      }

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      container.replaceChildren(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.cursor = "default";
      renderer.domElement.style.touchAction = "pan-y pinch-zoom";

      // 2. Studio Environment Map (PMREM RoomEnvironment)
      const pmrem = new THREE.PMREMGenerator(renderer);
      const environmentScene = new RoomEnvironment();
      const environmentTarget = pmrem.fromScene(environmentScene);
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = 0.32;

      // 3. Studio Base Illumination
      const hemisphere = new THREE.HemisphereLight(0xdde6ff, 0x40372f, 0.65);
      scene.add(hemisphere);

      const ambientLight = new THREE.AmbientLight(0x20232c, 0.55);
      scene.add(ambientLight);

      const fillLight = new THREE.DirectionalLight(0x9aa3b5, 1.4);
      fillLight.position.set(-4.5, 3.8, 2.8);
      scene.add(fillLight);

      // 4. Key 5KW Fresnel Spotlight
      const initialLook = STATION_LIGHTING_LOOKS[0];
      const keySpot = new THREE.SpotLight(new THREE.Color(initialLook.keyColor), initialLook.keyIntensity);
      keySpot.position.set(...initialLook.keyPosition);
      keySpot.target.position.set(0, 0.8, 0);
      scene.add(keySpot.target);
      keySpot.angle = 0.48;
      keySpot.penumbra = 0.65;
      keySpot.decay = 2;
      keySpot.distance = 0;
      keySpot.castShadow = true;
      keySpot.shadow.mapSize.set(1024, 1024);
      keySpot.shadow.bias = -0.0004;
      scene.add(keySpot);

      // 5. Rim / Kicker Spotlight
      const rimSpot = new THREE.SpotLight(new THREE.Color(initialLook.rimColor), initialLook.rimIntensity);
      rimSpot.position.set(...initialLook.rimPosition);
      rimSpot.target.position.set(0, 0.8, 0);
      scene.add(rimSpot.target);
      rimSpot.angle = 0.58;
      rimSpot.penumbra = 0.8;
      rimSpot.decay = 2;
      rimSpot.distance = 0;
      scene.add(rimSpot);

      // 6. Studio Floor & Cyclorama
      const floorGeo = new THREE.CircleGeometry(16, 48);
      const floorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0a0c10"),
        metalness: 0.32,
        roughness: 0.45,
        name: "StudioFloorReflective",
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.y = 0;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      const cycGeo = new THREE.CylinderGeometry(15, 15, 12, 36, 1, true, -Math.PI * 0.75, Math.PI * 1.5);
      const cycMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#060709"),
        metalness: 0.05,
        roughness: 0.95,
        side: THREE.BackSide,
      });
      const cycMesh = new THREE.Mesh(cycGeo, cycMat);
      cycMesh.position.set(0, 5, 0);
      cycMesh.receiveShadow = true;
      scene.add(cycMesh);

      // 7. Volumetric Atmospheric Spotlight Cone (Softened, low-opacity)
      const coneHeight = 4.35;
      const coneBottomRadius = 2.26;
      const coneGeo = new THREE.CylinderGeometry(0.32, coneBottomRadius, coneHeight, 32, 1, true);
      coneGeo.translate(0, -coneHeight / 2, 0);

      const coneMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(initialLook.coneColor) },
          uOpacity: { value: initialLook.coneOpacity },
          uIntensity: { value: 1.0 },
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
          uniform float uIntensity;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            // Soft longitudinal fade: fades out well before the floor intersection
            float longitudinalFade = smoothstep(0.04, 0.22, vUv.y) * (1.0 - smoothstep(0.72, 0.98, vUv.y));

            // Soft silhouette edge falloff
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float rim = abs(dot(viewDir, normal));
            float softRim = pow(1.0 - rim, 0.8) * 0.75 + rim * 0.25;

            float alpha = uOpacity * longitudinalFade * softRim * uIntensity;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });

      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.position.copy(keySpot.position);
      coneMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0.8, 0).sub(coneMesh.position).normalize()
      );
      scene.add(coneMesh);

      // 8. Populate Soundstage Scene Hierarchy
      const soundstageGroup = new THREE.Group();
      soundstageGroup.name = "SoundstageObjects";
      scene.add(soundstageGroup);

      // A. Director's Chair (Center Focal Point at origin)
      let chairGroup: THREE.Group = createDirectorChair();
      chairGroup.position.set(0, 0, 0);
      chairGroup.rotation.y = 0.25; // 3/4 turn towards studio audience
      soundstageGroup.add(chairGroup);

      // B. 120° Curved Dolly Track
      const dollyTrackGroup = createDollyTrack();
      soundstageGroup.add(dollyTrackGroup);

      // C. Overhead Truss Rigging & Fresnel Housing
      const overheadRigGroup = createOverheadLighting();
      soundstageGroup.add(overheadRigGroup);

      let fresnelLensMesh: THREE.Mesh | null = null;
      overheadRigGroup.traverse((child) => {
        if (child.name === "FresnelLensMesh" && child instanceof THREE.Mesh) {
          fresnelLensMesh = child;
        }
      });

      // D. 35mm Cinema Camera Rig on Hydraulic Dolly
      let cameraRigGroup: THREE.Group = createCameraRig();
      soundstageGroup.add(cameraRigGroup);

      // Query articulated nodes
      let panHeadGroup: THREE.Object3D | null = cameraRigGroup.getObjectByName("PanHeadGroup");
      let focusRingNode: THREE.Object3D | null = cameraRigGroup.getObjectByName("FocusRing");
      let focusRingInitialQuat: THREE.Quaternion | null = focusRingNode ? focusRingNode.quaternion.clone() : null;

      // Wheel tire meshes for rolling rotation
      const wheelMeshes: THREE.Mesh[] = [];
      cameraRigGroup.traverse((child) => {
        if (child.name === "WheelTireMesh" && child instanceof THREE.Mesh) {
          wheelMeshes.push(child);
        }
      });

      // Async GLTF Loading with unmount protection
      const gltfLoader = new GLTFLoader();

      gltfLoader.load(
        "/models/director-chair.glb",
        (gltf) => {
          if (disposed) {
            disposeOwnedObject(gltf.scene);
            return;
          }
          const loadedChair = gltf.scene;
          loadedChair.name = "DirectorsChairGLB";
          loadedChair.position.copy(chairGroup.position);
          loadedChair.rotation.copy(chairGroup.rotation);
          loadedChair.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.userData = { componentId: "chair" };
            }
          });
          soundstageGroup.remove(chairGroup);
          disposeOwnedObject(chairGroup);
          chairGroup = loadedChair;
          soundstageGroup.add(loadedChair);
        },
        undefined,
        (err) => {
          if (disposed) return;
          console.warn("Soundstage chair GLB load failed, keeping procedural asset:", err);
        }
      );

      gltfLoader.load(
        "/models/soundstage-camera.glb",
        (gltf) => {
          if (disposed) {
            disposeOwnedObject(gltf.scene);
            return;
          }
          const loadedCamera = gltf.scene;
          loadedCamera.name = "CinemaCameraGLB";
          loadedCamera.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.userData = { componentId: "camera" };
            }
          });
          soundstageGroup.remove(cameraRigGroup);
          disposeOwnedObject(cameraRigGroup);
          cameraRigGroup = loadedCamera;
          soundstageGroup.add(loadedCamera);

          // Re-query articulated nodes
          panHeadGroup = loadedCamera.getObjectByName("PanHeadGroup");
          focusRingNode = loadedCamera.getObjectByName("FocusRing");
          focusRingInitialQuat = focusRingNode ? focusRingNode.quaternion.clone() : null;

          wheelMeshes.length = 0;
          loadedCamera.traverse((child) => {
            if (child.name === "WheelTireMesh" && child instanceof THREE.Mesh) {
              wheelMeshes.push(child);
            }
          });
        },
        undefined,
        (err) => {
          if (disposed) return;
          console.warn("Soundstage camera GLB load failed, keeping procedural asset:", err);
        }
      );

      // 9. Deterministic Track Sequence Controller
      const trackSequence = createTrackSequence(propsRef.current.activeStationIndex);

      sequenceActionsRef.current = {
        goToStation: (index: number) => {
          if (propsRef.current.reducedMotion) {
            trackSequence.jumpToStation(index);
          } else {
            trackSequence.goToStation(index);
          }
        },
        resetSequence: () => {
          trackSequence.reset();
        },
      };

      // 10. Interactive Raycasting & Pointer Parallax
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pointerTarget = new THREE.Vector2(0, 0);
      const pointerSmooth = new THREE.Vector2(0, 0);

      const getInteractiveComponent = (e: PointerEvent): SoundstageComponent | null => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(soundstageGroup.children, true);

        for (const hit of intersects) {
          let curr: THREE.Object3D | null = hit.object;
          while (curr && curr !== soundstageGroup && curr !== scene) {
            const id = curr.userData?.componentId;
            if (id && SOUNDSTAGE_COMPONENTS[id]) {
              return SOUNDSTAGE_COMPONENTS[id];
            }
            curr = curr.parent;
          }
        }
        return null;
      };

      let hoveredId: string | null = null;

      const onPointerMove = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        pointerTarget.set(nx, ny);

        const comp = getInteractiveComponent(e);
        if (comp?.id !== hoveredId) {
          hoveredId = comp ? comp.id : null;
          callbacksRef.current.onHoverComponent(comp);
          renderer.domElement.style.cursor = comp ? "pointer" : "default";
        }
      };

      const onPointerLeave = () => {
        pointerTarget.set(0, 0);
        if (hoveredId) {
          hoveredId = null;
          callbacksRef.current.onHoverComponent(null);
          renderer.domElement.style.cursor = "default";
        }
      };

      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerleave", onPointerLeave);

      // Context Loss Handling
      const onContextLost = (e: Event) => {
        e.preventDefault();
        console.warn("Soundstage WebGL context lost");
      };
      const onContextRestored = () => {
        console.log("Soundstage WebGL context restored");
        renderer.render(scene, camera);
      };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost);
      renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

      // 11. Responsive Resize
      const handleResize = () => {
        if (!container || disposed) return;
        width = container.clientWidth || 800;
        height = container.clientHeight || 500;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      // 12. Visibility & RAF Scheduler
      let isVisibleOnScreen = true;
      let isTabActive = true;
      let animId = 0;
      let lastTime = performance.now();
      let hasReportedReady = false;

      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isVisibleOnScreen = entry ? entry.isIntersecting : true;
          if (isVisibleOnScreen && isTabActive) {
            lastTime = performance.now();
            if (!animId) {
              animId = requestAnimationFrame(animate);
            }
          }
        },
        { threshold: 0.05 }
      );
      intersectionObserver.observe(container);

      const onVisibilityChange = () => {
        isTabActive = !document.hidden;
        if (isTabActive && isVisibleOnScreen) {
          lastTime = performance.now();
          if (!animId) {
            animId = requestAnimationFrame(animate);
          }
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);

      // Reusable Math and Color Objects (Zero per-frame allocations)
      const chairTarget = new THREE.Vector3(0, 0.85, 0);
      const headWorldPos = new THREE.Vector3();
      const lookDirWorld = new THREE.Vector3();
      const lookDirLocal = new THREE.Vector3();
      const focusTarget = new THREE.Vector3(0, 0.75, 0.15);

      const tempColor = new THREE.Color();
      const tempKeyPos = new THREE.Vector3();
      const tempRimPos = new THREE.Vector3();

      let wheelRollAngle = 0;
      let lastReportedStation = -1;
      let lastReportedPhase = "";

      // 13. Main Animation Loop
      const animate = (time: number) => {
        if (disposed) return;

        if (!isVisibleOnScreen || !isTabActive) {
          animId = 0;
          return;
        }

        animId = requestAnimationFrame(animate);

        const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;

        const currentProps = propsRef.current;
        const isRunning = !currentProps.isPaused && !currentProps.reducedMotion;

        // A. Update Track Sequence Timeline
        const seq: TrackSequenceState = trackSequence.update(deltaSeconds, isRunning);

        // Report station and phase changes to HUD
        if (seq.station !== lastReportedStation || seq.phase !== lastReportedPhase) {
          lastReportedStation = seq.station;
          lastReportedPhase = seq.phase;
          const currentLook = STATION_LIGHTING_LOOKS[seq.station];
          callbacksRef.current.onStationChange(seq.station, seq.phase, currentLook.title);
        }

        // B. Position and Orient Cinema Camera Dolly along the Rail Curve
        const R = TRACK_CONFIG.centerlineRadius;
        const dollyX = TRACK_CONFIG.centerX + Math.sin(seq.angle) * R;
        const dollyZ = TRACK_CONFIG.centerZ + Math.cos(seq.angle) * R;

        cameraRigGroup.position.set(dollyX, 0, dollyZ);
        // Chassis follows the track tangent: angle + 90 degrees
        cameraRigGroup.rotation.y = seq.angle + Math.PI / 2;

        // C. Rotate Camera Head to Track the Director's Chair
        if (panHeadGroup) {
          panHeadGroup.getWorldPosition(headWorldPos);
          lookDirWorld.subVectors(chairTarget, headWorldPos).normalize();

          // Convert world look direction into dolly root local coordinates
          lookDirLocal.copy(lookDirWorld).applyQuaternion(cameraRigGroup.quaternion.clone().invert());
          const pan = Math.atan2(lookDirLocal.x, lookDirLocal.z);
          const tilt = Math.atan2(lookDirLocal.y, Math.sqrt(lookDirLocal.x * lookDirLocal.x + lookDirLocal.z * lookDirLocal.z));
          panHeadGroup.rotation.set(-tilt, pan, 0, "YXZ");
        }

        // D. Rotate Wheels along Axle from Distance Travelled
        if (Math.abs(seq.distanceDelta) > 0.00001) {
          wheelRollAngle += seq.distanceDelta / TRACK_CONFIG.wheelRadius;
          for (const wheel of wheelMeshes) {
            wheel.rotation.x = wheelRollAngle;
          }
        }

        // Focus Ring Subtle Rotation while traveling
        if (focusRingNode && focusRingInitialQuat && isRunning) {
          focusRingNode.quaternion.copy(focusRingInitialQuat);
          focusRingNode.rotateZ(Math.sin(time * 0.002) * 0.25);
        }

        // E. Interpolate 5 Station Lighting Looks
        const fromLook = STATION_LIGHTING_LOOKS[seq.lightFrom];
        const toLook = STATION_LIGHTING_LOOKS[seq.lightTo];
        const mix = seq.lightMix;

        // 1. Key Spotlight
        tempColor.copy(new THREE.Color(fromLook.keyColor)).lerp(new THREE.Color(toLook.keyColor), mix);
        keySpot.color.copy(tempColor);
        keySpot.intensity = THREE.MathUtils.lerp(fromLook.keyIntensity, toLook.keyIntensity, mix);

        tempKeyPos.set(...fromLook.keyPosition).lerp(new THREE.Vector3(...toLook.keyPosition), mix);
        keySpot.position.copy(tempKeyPos);

        // 2. Fill Directional Light
        tempColor.copy(new THREE.Color(fromLook.fillColor)).lerp(new THREE.Color(toLook.fillColor), mix);
        fillLight.color.copy(tempColor);
        fillLight.intensity = THREE.MathUtils.lerp(fromLook.fillIntensity, toLook.fillIntensity, mix);

        // 3. Rim Spotlight
        tempColor.copy(new THREE.Color(fromLook.rimColor)).lerp(new THREE.Color(toLook.rimColor), mix);
        rimSpot.color.copy(tempColor);
        rimSpot.intensity = THREE.MathUtils.lerp(fromLook.rimIntensity, toLook.rimIntensity, mix);

        tempRimPos.set(...fromLook.rimPosition).lerp(new THREE.Vector3(...toLook.rimPosition), mix);
        rimSpot.position.copy(tempRimPos);

        // 4. Studio Ambient Light
        tempColor.copy(new THREE.Color(fromLook.ambientColor)).lerp(new THREE.Color(toLook.ambientColor), mix);
        ambientLight.color.copy(tempColor);
        ambientLight.intensity = THREE.MathUtils.lerp(fromLook.ambientIntensity, toLook.ambientIntensity, mix);

        // 5. Fresnel Lens Emissive Glow
        if (fresnelLensMesh) {
          const mat = fresnelLensMesh.material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            tempColor.copy(new THREE.Color(fromLook.fresnelLensEmissive)).lerp(new THREE.Color(toLook.fresnelLensEmissive), mix);
            mat.emissive.copy(tempColor);
          }
        }

        // 6. Volumetric Atmospheric Spotlight Cone
        coneMesh.position.copy(keySpot.position);
        coneMesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, -1, 0),
          chairTarget.clone().sub(coneMesh.position).normalize()
        );
        coneMat.uniforms.uColor.value.copy(tempColor);
        coneMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(fromLook.coneOpacity, toLook.coneOpacity, mix);

        // F. Viewer Camera: Fixed Deliberate 3/4 Studio View with Subtle Parallax
        const isMobile = width < 768;
        pointerSmooth.lerp(pointerTarget, 0.08);

        const parallaxX = pointerSmooth.x * 0.18;
        const parallaxY = pointerSmooth.y * 0.12;

        if (isMobile) {
          camera.position.set(3.6 + parallaxX, 2.65 + parallaxY, 5.0);
        } else {
          camera.position.set(3.3 + parallaxX, 2.3 + parallaxY, 4.6);
        }
        camera.lookAt(focusTarget);

        renderer.render(scene, camera);

        // G. Mark ready after first successful render
        if (!hasReportedReady) {
          hasReportedReady = true;
          callbacksRef.current.onReady();
        }
      };

      animId = requestAnimationFrame(animate);

      // 14. Teardown
      return () => {
        disposed = true;
        cancelAnimationFrame(animId);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);

        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);

        scene.environment = null;
        environmentTarget.dispose();
        environmentScene.dispose?.();
        pmrem.dispose();

        disposeOwnedObject(scene);

        renderer.dispose();
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    return (
      <div
        ref={mountRef}
        data-testid="soundstage-canvas-mount"
        className="w-full h-full select-none outline-none"
      />
    );
  }
);

SoundstageScene.displayName = "SoundstageScene";

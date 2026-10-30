import * as React from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  LightingPresetId,
  LIGHTING_PRESETS,
  SoundstageComponent,
  SOUNDSTAGE_COMPONENTS,
  MAX_ARC_ANGLE_RAD,
} from "./lighting-presets";
import {
  createDirectorChair,
  createCameraRig,
  createDollyTrack,
  createOverheadLighting,
} from "./SoundstageModels";

export interface SoundstageSceneHandle {
  resetView: () => void;
  setAngle: (angle: number) => void;
  getInitCount: () => number;
}

export interface SoundstageSceneProps {
  viewpointAngle: number;
  onAngleChange: (angle: number) => void;
  presetId: LightingPresetId;
  isPaused: boolean;
  reducedMotion?: boolean;
  onHoverComponent: (component: SoundstageComponent | null) => void;
  onReady: () => void;
}

// Helper: Deduplicated disposal of Three.js objects, geometries, materials, and textures
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
      const val = (m as Record<string, unknown>)[key];
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
      viewpointAngle,
      onAngleChange,
      presetId,
      isPaused,
      reducedMotion = false,
      onHoverComponent,
      onReady,
    },
    ref
  ) => {
    const mountRef = React.useRef<HTMLDivElement | null>(null);

    // Development lifecycle counter to verify stable scene instance
    const initCounterRef = React.useRef(0);

    // Keep event callbacks in a mutable ref so effect identity does not trigger reinitialization
    const callbacksRef = React.useRef({
      onAngleChange,
      onHoverComponent,
      onReady,
    });

    React.useLayoutEffect(() => {
      callbacksRef.current = {
        onAngleChange,
        onHoverComponent,
        onReady,
      };
    }, [onAngleChange, onHoverComponent, onReady]);

    // Keep mutable props in a synchronized ref for the render loop
    const propsRef = React.useRef({
      presetId,
      isPaused,
      reducedMotion,
      viewpointAngle,
    });

    React.useEffect(() => {
      propsRef.current = {
        presetId,
        isPaused,
        reducedMotion,
        viewpointAngle,
      };
    }, [presetId, isPaused, reducedMotion, viewpointAngle]);

    // External control refs for imperative handle
    const externalControlRef = React.useRef<{
      setTargetAngle: ((angle: number) => void) | null;
      resetView: (() => void) | null;
    }>({
      setTargetAngle: null,
      resetView: null,
    });

    React.useImperativeHandle(ref, () => ({
      resetView: () => {
        externalControlRef.current.resetView?.();
      },
      setAngle: (angle: number) => {
        externalControlRef.current.setTargetAngle?.(angle);
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
      scene.fog = new THREE.FogExp2(new THREE.Color("#08090C"), 0.028);

      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);

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
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.style.touchAction = "pan-y pinch-zoom";

      // 2. Studio Environment Map (PMREM RoomEnvironment)
      const pmrem = new THREE.PMREMGenerator(renderer);
      const environmentScene = new RoomEnvironment();
      const environmentTarget = pmrem.fromScene(environmentScene);
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = 0.35;

      // 3. Studio Base Illumination
      // Hemisphere Light: soft natural top/ground fill
      const hemisphere = new THREE.HemisphereLight(0xdde6ff, 0x40372f, 0.7);
      scene.add(hemisphere);

      // Studio Ambient Light: baseline shadow visibility
      const ambientLight = new THREE.AmbientLight(0x20232c, 0.6);
      scene.add(ambientLight);

      // Directional Studio Fill Light
      const fillLight = new THREE.DirectionalLight(0x9aa3b5, 1.4);
      fillLight.position.set(-4.5, 3.8, 2.8);
      scene.add(fillLight);

      // 4. Key 5KW Fresnel Spotlight
      const keySpot = new THREE.SpotLight(0xffd19a, 0); // starts 0 for smooth entrance
      keySpot.position.set(0.6, 4.4, 0.9);
      keySpot.target.position.set(0.05, 0.8, -0.05);
      scene.add(keySpot.target);
      keySpot.angle = 0.48;
      keySpot.penumbra = 0.65;
      keySpot.decay = 2; // physically realistic inverse-square decay
      keySpot.distance = 0; // infinite reach with decay
      keySpot.castShadow = true;
      keySpot.shadow.mapSize.set(1024, 1024);
      keySpot.shadow.camera.near = 0.5;
      keySpot.shadow.camera.far = 16;
      keySpot.shadow.bias = -0.0004;
      scene.add(keySpot);

      // 5. Rim / Kicker Spotlight (Behind equipment)
      const rimSpot = new THREE.SpotLight(0xe9b457, 0);
      rimSpot.position.set(2.4, 3.2, -2.8);
      rimSpot.target.position.set(0.5, 0.9, 0.1);
      scene.add(rimSpot.target);
      rimSpot.angle = 0.6;
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

      // Studio Cyclorama Wall
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

      // 7. Volumetric Atmospheric Spotlight Cone
      // h = 4.35m; radius matches spotlight angle tan(0.48)*4.35 ≈ 2.26m
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
          uColor: { value: new THREE.Color("#ffd19a") },
          uOpacity: { value: 0.28 },
          uIntensity: { value: 0.0 }, // starts 0 for entrance
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
            // Correct non-reversed longitudinal fade
            // vUv.y: 0 is bottom (near floor), 1 is top (at Fresnel lens)
            float longitudinalFade = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));

            // Soft silhouette edge falloff
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float rim = abs(dot(viewDir, normal));
            float softRim = pow(1.0 - rim, 0.6) * 0.7 + rim * 0.3;

            float alpha = uOpacity * longitudinalFade * softRim * uIntensity;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });

      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.position.set(0.6, 4.4, 0.9);
      const lookTarget = new THREE.Vector3(0.05, 0.02, -0.05);
      coneMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        lookTarget.clone().sub(coneMesh.position).normalize()
      );
      scene.add(coneMesh);

      // 8. Populate Soundstage Equipment
      const soundstageGroup = new THREE.Group();
      soundstageGroup.name = "SoundstageObjects";
      scene.add(soundstageGroup);

      // A. Director's Chair (Center Focal Point)
      let chairGroup: THREE.Group = createDirectorChair();
      chairGroup.position.set(0.05, 0, -0.05);
      chairGroup.rotation.y = 0.32;
      soundstageGroup.add(chairGroup);

      // B. 35mm Cinema Camera Rig on Hydraulic Dolly
      let cameraRigGroup: THREE.Group = createCameraRig();
      cameraRigGroup.position.set(1.9, 0, 0.75);
      cameraRigGroup.rotation.y = -0.72;
      soundstageGroup.add(cameraRigGroup);

      // C. Curved Dolly Track on Studio Floor
      const dollyTrackGroup = createDollyTrack();
      soundstageGroup.add(dollyTrackGroup);

      // D. Overhead Rigging & 5KW Fresnel Spotlight
      const overheadRigGroup = createOverheadLighting();
      soundstageGroup.add(overheadRigGroup);

      // References for animated nodes
      let focusRingNode: THREE.Object3D | null = cameraRigGroup.getObjectByName("FocusRing");
      let focusRingInitialQuat: THREE.Quaternion | null = focusRingNode ? focusRingNode.quaternion.clone() : null;

      let fresnelLensMesh: THREE.Mesh | null = null;
      overheadRigGroup.traverse((child) => {
        if (child.name === "FresnelLensMesh" && child instanceof THREE.Mesh) {
          fresnelLensMesh = child;
        }
      });

      // 9. Safe Asynchronous GLTF Model Loading with Unmount Guard
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
          loadedCamera.position.copy(cameraRigGroup.position);
          loadedCamera.rotation.copy(cameraRigGroup.rotation);
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

          // Re-query focus ring from newly loaded GLB
          focusRingNode = loadedCamera.getObjectByName("FocusRing");
          focusRingInitialQuat = focusRingNode ? focusRingNode.quaternion.clone() : null;
        },
        undefined,
        (err) => {
          if (disposed) return;
          console.warn("Soundstage camera GLB load failed, keeping procedural asset:", err);
        }
      );

      // 10. Per-Instance Animation State
      const animState = {
        viewpointAngle: propsRef.current.viewpointAngle,
        targetAngle: propsRef.current.viewpointAngle,
        isDragging: false,
        lastPointerX: 0,
        entranceTime: 0,
        isEntranceDone: false,
        ambientTime: 0,
        hoveredId: null as string | null,
      };

      externalControlRef.current = {
        setTargetAngle: (angle: number) => {
          const clamped = THREE.MathUtils.clamp(angle, -MAX_ARC_ANGLE_RAD, MAX_ARC_ANGLE_RAD);
          animState.targetAngle = clamped;
          // If user interacts during entrance, skip camera travel and finalize entrance
          if (!animState.isEntranceDone) {
            animState.entranceTime = 2.4;
            animState.isEntranceDone = true;
          }
          callbacksRef.current.onAngleChange(clamped);
        },
        resetView: () => {
          animState.targetAngle = 0;
          if (!animState.isEntranceDone) {
            animState.entranceTime = 2.4;
            animState.isEntranceDone = true;
          }
          callbacksRef.current.onAngleChange(0);
        },
      };

      // 11. Interactive Raycasting & Pointer Listeners
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

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

      const onPointerDown = (e: PointerEvent) => {
        animState.isDragging = true;
        animState.lastPointerX = e.clientX;
        renderer.domElement.style.cursor = "grabbing";
        renderer.domElement.setPointerCapture(e.pointerId);

        // Cancel entrance camera travel if user drags
        if (!animState.isEntranceDone) {
          animState.entranceTime = 2.4;
          animState.isEntranceDone = true;
        }
      };

      const onPointerMove = (e: PointerEvent) => {
        if (animState.isDragging) {
          const deltaX = e.clientX - animState.lastPointerX;
          animState.lastPointerX = e.clientX;

          const sensitivity = 0.0032;
          const deltaRad = -deltaX * sensitivity;

          const newTarget = THREE.MathUtils.clamp(
            animState.targetAngle + deltaRad,
            -MAX_ARC_ANGLE_RAD,
            MAX_ARC_ANGLE_RAD
          );

          animState.targetAngle = newTarget;
          animState.viewpointAngle = newTarget;
          callbacksRef.current.onAngleChange(newTarget);
        } else {
          // Hover inspection
          const comp = getInteractiveComponent(e);
          if (comp?.id !== animState.hoveredId) {
            animState.hoveredId = comp ? comp.id : null;
            callbacksRef.current.onHoverComponent(comp);
            renderer.domElement.style.cursor = comp ? "pointer" : "grab";
          }
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        if (animState.isDragging) {
          animState.isDragging = false;
          renderer.domElement.style.cursor = "grab";
          try {
            renderer.domElement.releasePointerCapture(e.pointerId);
          } catch (_e) {
            void _e;
          }
        }
      };

      const onPointerLeave = () => {
        if (!animState.isDragging && animState.hoveredId) {
          animState.hoveredId = null;
          callbacksRef.current.onHoverComponent(null);
          renderer.domElement.style.cursor = "grab";
        }
      };

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("pointercancel", onPointerUp);
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

      // 12. Responsive Resize Handling
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

      // 13. Reusable Color & Vector Allocations (Zero GC per-frame allocations)
      const targetKeyColor = new THREE.Color();
      const targetFillColor = new THREE.Color();
      const targetRimColor = new THREE.Color();
      const targetAmbientColor = new THREE.Color();
      const focusTarget = new THREE.Vector3(0.15, 0.95, -0.05);

      // 14. Visibility Observer & RAF Scheduler
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

      // 15. Main Animation Loop
      const animate = (time: number) => {
        if (disposed) return;

        // Stop loop when completely offscreen or tab hidden to conserve GPU/battery
        if (!isVisibleOnScreen || !isTabActive) {
          animId = 0;
          return;
        }

        animId = requestAnimationFrame(animate);

        const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;

        const currentProps = propsRef.current;
        const reducedMotion = currentProps.reducedMotion;

        // A. Directed 2.4s Entrance Sequence
        let entranceProgress = 1.0;
        let entranceCameraOffset = 0;

        if (!animState.isEntranceDone) {
          animState.entranceTime += deltaSeconds;
          const progress = Math.min(animState.entranceTime / 2.4, 1.0);
          // Cubic ease-out
          const eased = 1.0 - Math.pow(1.0 - progress, 3);
          entranceProgress = eased;
          entranceCameraOffset = (1.0 - eased) * 0.45;

          if (progress >= 1.0) {
            animState.isEntranceDone = true;
          }
        }

        // B. Viewpoint Damping (Delta-time based, frame-rate independent)
        animState.viewpointAngle = reducedMotion
          ? animState.targetAngle
          : THREE.MathUtils.damp(animState.viewpointAngle, animState.targetAngle, 8, deltaSeconds);

        // C. Continuous Ambient Motion
        // When paused or reduced-motion, ambient clock is frozen, preserving exact drift pose without snaps
        if (!currentProps.isPaused && !reducedMotion) {
          animState.ambientTime += deltaSeconds;
        }

        const t = animState.ambientTime;
        const azimuthDrift = Math.sin(t * 0.22) * 0.012;
        const elevationDrift = Math.cos(t * 0.18) * 0.035;

        // Lens Focus Ring Animation (rotates explicitly around local axis)
        if (focusRingNode && focusRingInitialQuat && !currentProps.isPaused && !reducedMotion) {
          focusRingNode.quaternion.copy(focusRingInitialQuat);
          focusRingNode.rotateZ(Math.sin(t * 0.45) * 0.22);
        }

        // D. Smooth Lighting Preset Lerping (OUTSIDE pause check - works while paused!)
        const blend = reducedMotion ? 1.0 : 1.0 - Math.exp(-6.0 * deltaSeconds);
        const preset = LIGHTING_PRESETS[currentProps.presetId];

        // Key spotlight intensity and color
        targetKeyColor.set(preset.keyColor);
        keySpot.color.lerp(targetKeyColor, blend);
        keySpot.intensity = THREE.MathUtils.lerp(
          keySpot.intensity,
          preset.keyIntensity * entranceProgress,
          blend
        );

        // Fill directional light
        targetFillColor.set(preset.fillColor);
        fillLight.color.lerp(targetFillColor, blend);
        fillLight.intensity = THREE.MathUtils.lerp(fillLight.intensity, preset.fillIntensity, blend);

        // Rim spotlight
        targetRimColor.set(preset.rimColor);
        rimSpot.color.lerp(targetRimColor, blend);
        rimSpot.intensity = THREE.MathUtils.lerp(
          rimSpot.intensity,
          preset.rimIntensity * entranceProgress,
          blend
        );

        // Studio ambient
        targetAmbientColor.set(preset.ambientColor);
        ambientLight.color.lerp(targetAmbientColor, blend);
        ambientLight.intensity = THREE.MathUtils.lerp(ambientLight.intensity, preset.ambientIntensity, blend);

        // Fresnel fixture emissive lens sync
        if (fresnelLensMesh) {
          const mat = fresnelLensMesh.material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            mat.emissive.lerp(new THREE.Color(preset.fresnelLensEmissive), blend);
          }
        }

        // Volumetric atmospheric spotlight cone sync
        coneMat.uniforms.uColor.value.lerp(targetKeyColor, blend);
        coneMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(
          coneMat.uniforms.uOpacity.value,
          preset.coneOpacity,
          blend
        );
        coneMat.uniforms.uIntensity.value = THREE.MathUtils.lerp(
          coneMat.uniforms.uIntensity.value,
          entranceProgress,
          blend
        );

        // E. Camera Framing & Orientation
        const isMobile = width < 768;
        const baseRadius = isMobile ? 8.2 : 6.8;
        const baseHeight = isMobile ? 2.9 : 2.35;
        const baseAzimuth = 0.36; // 3/4 studio angle default

        const totalAzimuth = baseAzimuth + animState.viewpointAngle + azimuthDrift;
        const totalRadius = baseRadius + entranceCameraOffset;
        const totalHeight = baseHeight + elevationDrift + entranceCameraOffset * 0.5;

        camera.position.x = focusTarget.x + Math.sin(totalAzimuth) * totalRadius;
        camera.position.z = focusTarget.z + Math.cos(totalAzimuth) * totalRadius;
        camera.position.y = totalHeight;
        camera.lookAt(focusTarget);

        renderer.render(scene, camera);

        // F. Report Ready after essential content is rendered
        if (!hasReportedReady) {
          hasReportedReady = true;
          callbacksRef.current.onReady();
        }
      };

      animId = requestAnimationFrame(animate);

      // 16. Comprehensive Teardown
      return () => {
        disposed = true;
        cancelAnimationFrame(animId);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);

        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointercancel", onPointerUp);
        renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);

        // Clean up RoomEnvironment texture & PMREM
        scene.environment = null;
        environmentTarget.dispose();
        environmentScene.dispose?.();
        pmrem.dispose();

        // Dispose scene contents deduplicating resources
        disposeOwnedObject(scene);

        renderer.dispose();
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []); // Empty dependency array: ONE scene instance is owned per lifecycle

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

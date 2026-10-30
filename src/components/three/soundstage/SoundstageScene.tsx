import * as React from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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
}

export interface SoundstageSceneProps {
  viewpointAngle: number;
  onAngleChange: (angle: number) => void;
  presetId: LightingPresetId;
  isPaused: boolean;
  onHoverComponent: (component: SoundstageComponent | null) => void;
  onReady: () => void;
}

export const SoundstageScene = React.forwardRef<SoundstageSceneHandle, SoundstageSceneProps>(
  (
    {
      viewpointAngle,
      onAngleChange,
      presetId,
      isPaused,
      onHoverComponent,
      onReady,
    },
    ref
  ) => {
    const mountRef = React.useRef<HTMLDivElement | null>(null);

    // Refs for animation loop and interaction
    const stateRef = React.useRef({
      viewpointAngle,
      targetAngle: viewpointAngle,
      presetId,
      isPaused,
      isDragging: false,
      lastPointerX: 0,
      dragVelocity: 0,
      entranceTime: 0,
      isEntranceDone: false,
      ambientTime: 0,
      hoveredId: null as string | null,
    });

    // Keep stateRef in sync with props
    React.useEffect(() => {
      stateRef.current.presetId = presetId;
    }, [presetId]);

    React.useEffect(() => {
      stateRef.current.isPaused = isPaused;
    }, [isPaused]);

    React.useEffect(() => {
      // Sync from slider or external angle changes when not actively dragging
      if (!stateRef.current.isDragging) {
        stateRef.current.targetAngle = viewpointAngle;
      }
    }, [viewpointAngle]);

    const lightsRef = React.useRef<{
      keySpot: THREE.SpotLight | null;
      fillDir: THREE.DirectionalLight | null;
      rimSpot: THREE.SpotLight | null;
      ambient: THREE.AmbientLight | null;
      coneMesh: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial> | null;
      fresnelLensMesh: THREE.Mesh | null;
      focusRingMesh: THREE.Mesh | null;
    }>({
      keySpot: null,
      fillDir: null,
      rimSpot: null,
      ambient: null,
      coneMesh: null,
      fresnelLensMesh: null,
      focusRingMesh: null,
    });

    // Expose reset and setAngle imperative handle
    React.useImperativeHandle(ref, () => ({
      resetView: () => {
        stateRef.current.targetAngle = 0;
        stateRef.current.dragVelocity = 0;
        onAngleChange(0);
      },
      setAngle: (angle: number) => {
        stateRef.current.targetAngle = THREE.MathUtils.clamp(
          angle,
          -MAX_ARC_ANGLE_RAD,
          MAX_ARC_ANGLE_RAD
        );
        onAngleChange(stateRef.current.targetAngle);
      },
    }));

    React.useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      let width = container.clientWidth || 800;
      let height = container.clientHeight || 500;

      // 1. Scene, Camera, Renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#060709");
      scene.fog = new THREE.FogExp2(new THREE.Color("#060709"), 0.035);

      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      container.replaceChildren(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.style.touchAction = "pan-y pinch-zoom";

      // 2. Studio Cyclorama Floor
      const floorGeo = new THREE.CircleGeometry(16, 48);
      const floorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#08090C"),
        metalness: 0.38,
        roughness: 0.44,
        name: "StudioFloorReflective",
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.y = 0;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      // Studio Cyclorama curved background wall
      const cycGeo = new THREE.CylinderGeometry(15, 15, 12, 36, 1, true, -Math.PI * 0.75, Math.PI * 1.5);
      const cycMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#040507"),
        metalness: 0.05,
        roughness: 0.95,
        side: THREE.BackSide,
      });
      const cycMesh = new THREE.Mesh(cycGeo, cycMat);
      cycMesh.position.set(0, 5, 0);
      cycMesh.receiveShadow = true;
      scene.add(cycMesh);

      // 3. Populate Soundstage Equipment
      const soundstageGroup = new THREE.Group();
      soundstageGroup.name = "SoundstageObjects";
      scene.add(soundstageGroup);

      // A. Director's Chair (Center Focal Point)
      const chairGroup = createDirectorChair();
      chairGroup.position.set(0.05, 0, -0.05);
      chairGroup.rotation.y = 0.32; // Slight 3/4 turn towards main camera view
      soundstageGroup.add(chairGroup);

      // B. 35mm Cinema Camera Rig on Hydraulic Dolly
      const cameraRigGroup = createCameraRig();
      cameraRigGroup.position.set(1.9, 0, 0.75);
      cameraRigGroup.rotation.y = -0.72; // Angled directly framing the director's chair
      soundstageGroup.add(cameraRigGroup);

      // Find focus ring in camera rig for subtle ambient animation
      cameraRigGroup.traverse((child) => {
        if (child.name === "FocusRing" || (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry && child.scale.y > 0.03)) {
          if (!lightsRef.current.focusRingMesh && child instanceof THREE.Mesh) {
            lightsRef.current.focusRingMesh = child;
          }
        }
      });

      // C. Curved Dolly Track on Studio Floor
      const dollyTrackGroup = createDollyTrack();
      soundstageGroup.add(dollyTrackGroup);

      // D. Overhead Rigging & 5KW Fresnel Spotlight
      const overheadRigGroup = createOverheadLighting();
      soundstageGroup.add(overheadRigGroup);

      // Find Fresnel lens mesh for emissive glow sync
      overheadRigGroup.traverse((child) => {
        if (child.name === "FresnelLensMesh" && child instanceof THREE.Mesh) {
          lightsRef.current.fresnelLensMesh = child;
        }
      });

      // Also attempt GLTF upgrade asynchronously for high-fidelity assets
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        "/models/director-chair.glb",
        (gltf) => {
          // Chair loaded from GLTF - seamless upgrade
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
          soundstageGroup.add(loadedChair);
        },
        undefined,
        (err) => {
          // Procedural fallback already active and rendered seamlessly
        }
      );

      gltfLoader.load(
        "/models/soundstage-camera.glb",
        (gltf) => {
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
          soundstageGroup.add(loadedCamera);
        },
        undefined,
        (err) => {
          // Procedural fallback active
        }
      );

      // 4. Lighting System
      // A. Key 5KW Fresnel Spotlight
      const keySpot = new THREE.SpotLight(0xffd19a, 0); // starts 0 for entrance
      keySpot.position.set(0.6, 4.25, 0.9);
      keySpot.target.position.set(0.05, 0.8, -0.05);
      scene.add(keySpot.target);
      keySpot.angle = 0.46;
      keySpot.penumbra = 0.72;
      keySpot.decay = 1.6;
      keySpot.distance = 15;
      keySpot.castShadow = true;
      keySpot.shadow.mapSize.width = 1024;
      keySpot.shadow.mapSize.height = 1024;
      keySpot.shadow.camera.near = 1.0;
      keySpot.shadow.camera.far = 16;
      keySpot.shadow.bias = -0.0004;
      scene.add(keySpot);
      lightsRef.current.keySpot = keySpot;

      // B. Volumetric Atmospheric Spotlight Cone
      // Geometry extends from fixture at y=4.25 down to floor at y=0.02
      const coneHeight = 4.23;
      const coneGeo = new THREE.CylinderGeometry(0.32, 2.5, coneHeight, 32, 1, true);
      // Translate cylinder center so top is at origin
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
            // Longitudinal fade: soft at lens exit, fades out before hitting floor
            float yFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

            // Rim / viewing angle falloff for volumetric softness
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float rim = abs(dot(viewDir, normal));
            float softRim = pow(1.0 - rim, 0.6) * 0.7 + rim * 0.3;

            float alpha = uOpacity * yFade * softRim * uIntensity;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });

      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.position.set(0.6, 4.25, 0.9);
      // Orient cone towards the spotlight target
      const lookTarget = new THREE.Vector3(0.05, 0.02, -0.05);
      coneMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        lookTarget.clone().sub(coneMesh.position).normalize()
      );
      scene.add(coneMesh);
      lightsRef.current.coneMesh = coneMesh;

      // C. Directional Studio Fill Light
      const fillDir = new THREE.DirectionalLight(0x8a94a6, 0.35);
      fillDir.position.set(-4.5, 3.8, 2.8);
      scene.add(fillDir);
      lightsRef.current.fillDir = fillDir;

      // D. Rim / Kicker Light (Behind equipment)
      const rimSpot = new THREE.SpotLight(0xe9b457, 1.6);
      rimSpot.position.set(2.4, 3.2, -2.8);
      rimSpot.target.position.set(0.8, 0.9, 0.2);
      scene.add(rimSpot.target);
      rimSpot.angle = 0.6;
      rimSpot.penumbra = 0.8;
      rimSpot.distance = 12;
      scene.add(rimSpot);
      lightsRef.current.rimSpot = rimSpot;

      // E. Studio Ambient Base
      const ambient = new THREE.AmbientLight(0x12141a, 0.45);
      scene.add(ambient);
      lightsRef.current.ambient = ambient;

      // 5. Interactive Raycasting Setup
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

      // 6. Pointer & Drag Event Listeners
      const onPointerDown = (e: PointerEvent) => {
        stateRef.current.isDragging = true;
        stateRef.current.lastPointerX = e.clientX;
        stateRef.current.dragVelocity = 0;
        renderer.domElement.style.cursor = "grabbing";
        renderer.domElement.setPointerCapture(e.pointerId);
      };

      const onPointerMove = (e: PointerEvent) => {
        if (stateRef.current.isDragging) {
          const deltaX = e.clientX - stateRef.current.lastPointerX;
          stateRef.current.lastPointerX = e.clientX;

          // Scrub camera along arc: drag right -> camera rotates right
          const sensitivity = 0.0032;
          const deltaRad = -deltaX * sensitivity;

          const newTarget = THREE.MathUtils.clamp(
            stateRef.current.targetAngle + deltaRad,
            -MAX_ARC_ANGLE_RAD,
            MAX_ARC_ANGLE_RAD
          );

          stateRef.current.dragVelocity = deltaRad;
          stateRef.current.targetAngle = newTarget;
          stateRef.current.viewpointAngle = newTarget;
          onAngleChange(newTarget);
        } else {
          // Hover inspection
          const comp = getInteractiveComponent(e);
          if (comp?.id !== stateRef.current.hoveredId) {
            stateRef.current.hoveredId = comp ? comp.id : null;
            onHoverComponent(comp);
            renderer.domElement.style.cursor = comp ? "pointer" : "grab";
          }
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        if (stateRef.current.isDragging) {
          stateRef.current.isDragging = false;
          renderer.domElement.style.cursor = "grab";
          try {
            renderer.domElement.releasePointerCapture(e.pointerId);
          } catch (_e) {
            void _e;
          }
        }
      };

      const onPointerLeave = () => {
        if (!stateRef.current.isDragging && stateRef.current.hoveredId) {
          stateRef.current.hoveredId = null;
          onHoverComponent(null);
          renderer.domElement.style.cursor = "grab";
        }
      };

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("pointercancel", onPointerUp);
      renderer.domElement.addEventListener("pointerleave", onPointerLeave);

      // 7. Responsive Sizing
      const handleResize = () => {
        if (!container) return;
        width = container.clientWidth || 800;
        height = container.clientHeight || 500;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      // 8. Main Animation Render Loop
      let animId = 0;
      let lastTime = performance.now();

      const animate = (time: number) => {
        animId = requestAnimationFrame(animate);

        const delta = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        const state = stateRef.current;

        // A. Directed Entrance Sequence (0 to 2.4s)
        if (!state.isEntranceDone) {
          state.entranceTime += delta;
          const entranceDuration = 2.4;
          const progress = Math.min(state.entranceTime / entranceDuration, 1.0);

          // Ease out cubic
          const eased = 1.0 - Math.pow(1.0 - progress, 3);

          // Power up spotlight smoothly
          const activePreset = LIGHTING_PRESETS[state.presetId];
          if (keySpot) {
            keySpot.intensity = activePreset.keyIntensity * Math.min(progress * 1.5, 1.0);
          }
          if (coneMat) {
            coneMat.uniforms.uIntensity.value = Math.min(progress * 1.4, 1.0);
          }

          if (progress >= 1.0) {
            state.isEntranceDone = true;
            onReady();
          }
        }

        // B. Inertia and angle easing
        if (!state.isDragging && Math.abs(state.dragVelocity) > 0.0001) {
          state.targetAngle = THREE.MathUtils.clamp(
            state.targetAngle + state.dragVelocity,
            -MAX_ARC_ANGLE_RAD,
            MAX_ARC_ANGLE_RAD
          );
          state.dragVelocity *= 0.91; // friction decay
          onAngleChange(state.targetAngle);
        }

        // Smooth lerp of viewpointAngle towards targetAngle
        state.viewpointAngle = THREE.MathUtils.lerp(state.viewpointAngle, state.targetAngle, 0.14);

        // C. Continuous Ambient Drift
        let ambientAzimuthOffset = 0;
        let ambientElevationOffset = 0;

        if (!state.isPaused) {
          state.ambientTime += delta;
          const t = state.ambientTime;

          // Subtle breathing camera drift: ~18s period, +-0.02 rad
          ambientAzimuthOffset = Math.sin(t * 0.35) * 0.022;
          ambientElevationOffset = Math.cos(t * 0.28) * 0.06;

          // Subtle lens focus ring rotation drift
          if (lightsRef.current.focusRingMesh) {
            lightsRef.current.focusRingMesh.rotation.z = Math.sin(t * 0.5) * 0.25;
          }

          // Subtle keylight tungsten hum (+-1.2%)
          if (keySpot && state.isEntranceDone) {
            const flicker = 1.0 + Math.sin(t * 8.0) * 0.012 + Math.cos(t * 19.0) * 0.008;
            const targetIntensity = LIGHTING_PRESETS[state.presetId].keyIntensity;
            keySpot.intensity = THREE.MathUtils.lerp(keySpot.intensity, targetIntensity * flicker, 0.1);
          }
        }

        // D. Smooth Lighting Preset Lerping
        const currentPresetConfig = LIGHTING_PRESETS[state.presetId];
        const lerpFactor = 0.08;

        if (keySpot && state.isEntranceDone) {
          keySpot.color.lerp(new THREE.Color(currentPresetConfig.keyColor), lerpFactor);
        }
        if (coneMat) {
          coneMat.uniforms.uColor.value.lerp(new THREE.Color(currentPresetConfig.coneColor), lerpFactor);
          coneMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(
            coneMat.uniforms.uOpacity.value,
            currentPresetConfig.coneOpacity,
            lerpFactor
          );
        }
        if (fillDir) {
          fillDir.color.lerp(new THREE.Color(currentPresetConfig.fillColor), lerpFactor);
          fillDir.intensity = THREE.MathUtils.lerp(fillDir.intensity, currentPresetConfig.fillIntensity, lerpFactor);
        }
        if (rimSpot) {
          rimSpot.color.lerp(new THREE.Color(currentPresetConfig.rimColor), lerpFactor);
          rimSpot.intensity = THREE.MathUtils.lerp(rimSpot.intensity, currentPresetConfig.rimIntensity, lerpFactor);
        }
        if (ambient) {
          ambient.color.lerp(new THREE.Color(currentPresetConfig.ambientColor), lerpFactor);
          ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, currentPresetConfig.ambientIntensity, lerpFactor);
        }
        if (lightsRef.current.fresnelLensMesh) {
          const mat = lightsRef.current.fresnelLensMesh.material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            mat.emissive.lerp(new THREE.Color(currentPresetConfig.fresnelLensEmissive), lerpFactor);
          }
        }

        // E. Camera Position & Framing
        // Focus focal point is Director's Chair center
        const focusTarget = new THREE.Vector3(0.15, 0.95, -0.05);

        const isMobile = width < 768;
        const baseRadius = isMobile ? 8.2 : 6.8;
        const baseHeight = isMobile ? 2.9 : 2.35;
        const baseAzimuth = 0.36; // 3/4 angle default

        // Entrance offset: smoothly blends out
        const entranceOffset = !state.isEntranceDone
          ? (1.0 - Math.min(state.entranceTime / 2.4, 1.0)) * 0.4
          : 0;

        const totalAzimuth = baseAzimuth + state.viewpointAngle + ambientAzimuthOffset;
        const totalRadius = baseRadius + entranceOffset;
        const totalHeight = baseHeight + ambientElevationOffset + entranceOffset * 0.6;

        camera.position.x = focusTarget.x + Math.sin(totalAzimuth) * totalRadius;
        camera.position.z = focusTarget.z + Math.cos(totalAzimuth) * totalRadius;
        camera.position.y = totalHeight;
        camera.lookAt(focusTarget);

        renderer.render(scene, camera);
      };

      animId = requestAnimationFrame(animate);

      // 9. Teardown
      return () => {
        cancelAnimationFrame(animId);
        resizeObserver.disconnect();

        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointercancel", onPointerUp);
        renderer.domElement.removeEventListener("pointerleave", onPointerLeave);

        renderer.dispose();
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
        }

        // Dispose geometries and materials
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else if (obj.material) {
              obj.material.dispose();
            }
          }
        });
      };
    }, [onAngleChange, onHoverComponent, onReady]);

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

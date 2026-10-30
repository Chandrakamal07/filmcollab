import * as React from "react";
import * as THREE from "three";
import {
  ObsidianComponent,
  loadObsidianLensController,
  ObsidianLensController,
} from "./ObsidianLensModel";

export interface ObsidianLensSceneProps {
  isPaused: boolean;
  aperture: number;
  focus: number;
  reducedMotion: boolean;
  onHoverComponent: (component: ObsidianComponent | null) => void;
  onFocusChange: (value: number) => void;
  onReady: () => void;
}

export const ObsidianLensScene: React.FC<ObsidianLensSceneProps> = React.memo(
  ({
    isPaused,
    aperture,
    focus,
    reducedMotion,
    onHoverComponent,
    onFocusChange,
    onReady,
  }) => {
    const mountRef = React.useRef<HTMLDivElement>(null);

    // Keep dynamic props in mutable refs to avoid restarting the WebGLRenderer effect
    const propsRef = React.useRef({
      isPaused,
      aperture,
      focus,
      reducedMotion,
    });
    propsRef.current = { isPaused, aperture, focus, reducedMotion };

    const callbacksRef = React.useRef({
      onHoverComponent,
      onFocusChange,
      onReady,
    });
    callbacksRef.current = {
      onHoverComponent,
      onFocusChange,
      onReady,
    };

    React.useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      let disposed = false;
      let width = container.clientWidth || 800;
      let height = container.clientHeight || 500;

      // 1. WebGL Renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.outline = "none";
      renderer.domElement.style.touchAction = "pan-y"; // Preserve vertical scrolling
      container.appendChild(renderer.domElement);

      // 2. Scene & Studio Lighting
      const scene = new THREE.Scene();

      // Studio Camera: Long 32-degree cinema FOV for low distortion
      const camera = new THREE.PerspectiveCamera(32, width / height, 0.05, 10);
      const isMobileInit = width < 768;
      if (isMobileInit) {
        camera.position.set(0.09, 0.06, 0.44);
      } else {
        camera.position.set(0.08, 0.05, 0.38);
      }
      const cameraTarget = new THREE.Vector3(0.005, 0.005, 0.015);
      camera.lookAt(cameraTarget);

      // 3. PMREM Studio Reflection Environment
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();

      const envScene = new THREE.Scene();
      const envBackdropGeo = new THREE.SphereGeometry(4, 24, 12);
      const envBackdropMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#0A0B0E"),
        side: THREE.BackSide,
      });
      envScene.add(new THREE.Mesh(envBackdropGeo, envBackdropMat));

      // Studio softbox highlight strips on environment sphere
      const softbox1 = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 4.5),
        new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF") })
      );
      softbox1.position.set(2.8, 1.8, 2.2);
      softbox1.lookAt(0, 0, 0);
      envScene.add(softbox1);

      const softboxWarm = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 3.2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFBA66") })
      );
      softboxWarm.position.set(-3.2, 1.2, -1.8);
      softboxWarm.lookAt(0, 0, 0);
      envScene.add(softboxWarm);

      const softboxCool = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 2.8),
        new THREE.MeshBasicMaterial({ color: new THREE.Color("#A8CAFF") })
      );
      softboxCool.position.set(2.0, -1.5, 1.5);
      softboxCool.lookAt(0, 0, 0);
      envScene.add(softboxCool);

      const envTarget = pmrem.fromScene(envScene);
      scene.environment = envTarget.texture;

      // 4. Physical Studio Lights
      // Broad Soft Key
      const keyLight = new THREE.DirectionalLight("#FFFFFF", 3.2);
      keyLight.position.set(0.38, 0.48, 0.42);
      scene.add(keyLight);

      // Warm Amber Rim Light
      const warmRim = new THREE.SpotLight("#FFAE4D", 4.8, 4.0, Math.PI / 4, 0.5, 1.0);
      warmRim.position.set(-0.48, 0.28, -0.32);
      warmRim.target.position.set(0, 0, 0);
      scene.add(warmRim);
      scene.add(warmRim.target);

      // Cool Optical Separation Fill
      const coolFill = new THREE.DirectionalLight("#96BCFF", 1.6);
      coolFill.position.set(0.35, -0.25, 0.32);
      scene.add(coolFill);

      // Subtle Ambient Foundation
      const ambientLight = new THREE.AmbientLight("#151820", 0.75);
      scene.add(ambientLight);

      // Dynamic Reflection Highlight Light (sweeps across the front glass)
      const sweepLight = new THREE.PointLight("#FFFFFF", 2.2, 1.8, 1.5);
      sweepLight.position.set(0.15, 0.22, 0.24);
      scene.add(sweepLight);

      // 5. Load / Build Obsidian Lens Controller
      let controller: ObsidianLensController | null = null;
      let hasReportedReady = false;

      loadObsidianLensController().then((c) => {
        if (disposed) {
          c.dispose();
          return;
        }
        controller = c;

        // Monumental 3/4 Cinema Lens Presentation Orientation
        // Front glass faces the viewer, barrel recedes smoothly into dark depth
        controller.presentationRoot.rotation.set(0.18, -0.58, -0.06);
        controller.presentationRoot.position.set(0, 0, 0);

        scene.add(controller.root);

        // Expose diagnostic handle for testing and inspection
        if (typeof window !== "undefined") {
          (window as unknown as { __obsidianLens?: unknown }).__obsidianLens = {
            getAperture: () => controller?.getAperture() ?? 0,
            getFocus: () => controller?.getFocus() ?? 0,
            setAperture: (val: number) => controller?.setAperture(val),
            setFocus: (val: number) => controller?.setFocus(val),
            getCameraPosition: () => camera.position,
            getPresentationRotation: () => controller?.presentationRoot.rotation,
          };
        }
      });

      // 6. Interaction & Pointer Parallax State
      const pointerTarget = new THREE.Vector2(0, 0);
      const pointerSmooth = new THREE.Vector2(0, 0);
      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2();

      let isDragging = false;
      let dragStartX = 0;
      let focusStartVal = 0.35;
      let hoveredId: string | null = null;

      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        isDragging = true;
        dragStartX = e.clientX;
        focusStartVal = propsRef.current.focus;
        renderer.domElement.setPointerCapture(e.pointerId);
      };

      const onPointerMove = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        pointerTarget.set(nx, ny);

        // Horizontal drag to focus
        if (isDragging) {
          const deltaPx = e.clientX - dragStartX;
          const deltaFocus = deltaPx / (rect.width * 0.7);
          const newFocus = THREE.MathUtils.clamp(focusStartVal + deltaFocus, 0, 1);
          callbacksRef.current.onFocusChange(newFocus);
          return;
        }

        // Hover raycasting
        if (controller) {
          pointerNdc.set(nx, ny);
          raycaster.setFromCamera(pointerNdc, camera);
          const comp = controller.getHoveredComponent(raycaster);
          if (comp?.id !== hoveredId) {
            hoveredId = comp ? comp.id : null;
            callbacksRef.current.onHoverComponent(comp);
            renderer.domElement.style.cursor = comp ? "pointer" : "default";
          }
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        if (isDragging) {
          isDragging = false;
          try {
            renderer.domElement.releasePointerCapture(e.pointerId);
          } catch (_err) {
            // pointer capture may have lapsed
          }
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

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("pointercancel", onPointerUp);
      renderer.domElement.addEventListener("pointerleave", onPointerLeave);

      // Context Loss Handling
      const onContextLost = (e: Event) => {
        e.preventDefault();
        console.warn("Obsidian Lens WebGL context lost");
      };
      const onContextRestored = () => {
        console.log("Obsidian Lens WebGL context restored");
        renderer.render(scene, camera);
      };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost);
      renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

      // 7. Responsive Resize
      const handleResize = () => {
        if (!container || disposed) return;
        width = container.clientWidth || 800;
        height = container.clientHeight || 500;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);

        const isMob = width < 768;
        if (isMob) {
          camera.position.set(0.09, 0.06, 0.44);
        } else {
          camera.position.set(0.08, 0.05, 0.38);
        }
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      // 8. Visibility & RAF Scheduler
      let isVisibleOnScreen = true;
      let isTabActive = true;
      let animId = 0;
      let lastTime = performance.now();
      let entranceProgress = 0; // 0 to 1 over 2.4s

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

      // Reusable vectors for frame updates
      const baseLensEuler = new THREE.Euler(0.18, -0.58, -0.06);

      // 9. Main Animation Loop
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

        // Entrance timeline (2.4 seconds)
        if (entranceProgress < 1.0) {
          entranceProgress = Math.min(entranceProgress + deltaSeconds / 2.4, 1.0);
        }

        // Pointer parallax interpolation
        pointerSmooth.lerp(pointerTarget, currentProps.reducedMotion ? 1 : 0.08);

        if (controller) {
          // Sync aperture and focus from React state
          if (entranceProgress < 0.8 && isRunning) {
            // Entrance choreography: iris opens smoothly from closed to sweet spot
            const openT = THREE.MathUtils.clamp((entranceProgress - 0.25) / 0.55, 0, 1);
            const eased = openT * openT * openT * (openT * (openT * 6 - 15) + 10);
            controller.setAperture(THREE.MathUtils.lerp(0.0, currentProps.aperture, eased));
          } else {
            controller.setAperture(currentProps.aperture);
          }

          controller.setFocus(currentProps.focus);
          controller.update(deltaSeconds, isRunning, currentProps.reducedMotion);

          // Subtle pointer parallax response: ±4° (0.07 rad) yaw, ±2° (0.035 rad) pitch
          const parallaxYaw = pointerSmooth.x * 0.07;
          const parallaxPitch = pointerSmooth.y * 0.035;

          // Subtle ambient idle breathing
          const idleAngle = isRunning ? Math.sin(time * 0.0008) * 0.012 : 0;
          const idlePitch = isRunning ? Math.cos(time * 0.0007) * 0.008 : 0;

          // Smooth entrance settlement
          const entranceEased = entranceProgress * entranceProgress * (3 - 2 * entranceProgress);
          const entranceOffsetX = (1 - entranceEased) * 0.04;
          const entranceOffsetYaw = (1 - entranceEased) * 0.12;

          controller.presentationRoot.rotation.set(
            baseLensEuler.x + parallaxPitch + idlePitch,
            baseLensEuler.y + parallaxYaw + idleAngle - entranceOffsetYaw,
            baseLensEuler.z
          );
          controller.presentationRoot.position.set(
            entranceOffsetX,
            (1 - entranceEased) * -0.01,
            0
          );
        }

        // Reflection highlight sweep
        if (isRunning) {
          const sweepX = 0.15 + Math.sin(time * 0.001) * 0.08 + pointerSmooth.x * 0.05;
          const sweepY = 0.20 + Math.cos(time * 0.0009) * 0.06 - pointerSmooth.y * 0.04;
          sweepLight.position.set(sweepX, sweepY, 0.24);
        }

        camera.lookAt(cameraTarget);
        renderer.render(scene, camera);

        // Report ready on first successful render
        if (!hasReportedReady) {
          hasReportedReady = true;
          callbacksRef.current.onReady();
        }
      };

      animId = requestAnimationFrame(animate);

      // 10. Disposal & Cleanup
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

        if (typeof window !== "undefined") {
          delete (window as unknown as { __obsidianLens?: unknown }).__obsidianLens;
        }

        controller?.dispose();

        scene.environment = null;
        envTarget.dispose();
        envBackdropMat.dispose();
        envBackdropGeo.dispose();
        pmrem.dispose();

        renderer.dispose();
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    return (
      <div
        ref={mountRef}
        data-testid="obsidian-lens-canvas-mount"
        className="w-full h-full select-none outline-none relative"
      />
    );
  }
);

ObsidianLensScene.displayName = "ObsidianLensScene";

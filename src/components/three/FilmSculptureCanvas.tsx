import * as React from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export interface FilmSculptureCanvasProps {
  className?: string;
  pointerOffset?: { x: number; y: number };
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export const FilmSculptureFallback: React.FC<{ className?: string }> = ({ className }) => (
  <div
    data-testid="film-sculpture-fallback"
    className={cn(
      "relative w-full h-full overflow-hidden flex items-center justify-center select-none pointer-events-none",
      className,
    )}
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_42%,rgba(233,180,87,0.22),rgba(24,26,29,0.4)_48%,transparent_75%)]" />
    <div
      className="relative w-[340px] h-[340px] sm:w-[440px] sm:h-[440px]"
      style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
    >
      <div
        className="absolute inset-6 rounded-full border border-primary/30 shadow-[0_0_80px_rgba(233,180,87,0.18)]"
        style={{ transform: "rotateX(58deg) rotateY(-22deg) translateZ(20px)" }}
      />
      <div
        className="absolute inset-14 rounded-full border-2 border-dashed border-primary/40"
        style={{ transform: "rotateX(58deg) rotateY(-22deg) translateZ(48px)" }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-36 rounded-xl border border-primary/50 bg-gradient-to-br from-primary/25 via-card/90 to-background/95 shadow-noir-lg flex flex-col justify-between p-3"
        style={{ transform: "translate(-50%, -50%) rotateX(14deg) rotateY(-24deg) translateZ(70px)" }}
      >
        <div className="flex justify-between items-center border-b border-primary/25 pb-1.5">
          <div className="flex gap-1.5">
            <span className="w-2 h-1.5 rounded-[1px] bg-primary/70" />
            <span className="w-2 h-1.5 rounded-[1px] bg-primary/70" />
            <span className="w-2 h-1.5 rounded-[1px] bg-primary/70" />
          </div>
          <span className="font-mono text-[9px] tracking-widest text-primary uppercase">35MM ANAMORPHIC</span>
        </div>
        <div className="my-auto text-center">
          <div className="w-10 h-10 mx-auto rounded-full border border-primary/50 bg-primary/15 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_16px_#E9B457]" />
          </div>
        </div>
        <div className="flex justify-between items-center border-t border-primary/25 pt-1.5">
          <span className="font-mono text-[9px] text-muted-foreground">SCENE 01 // TAKE 04</span>
          <div className="flex gap-1.5">
            <span className="w-2 h-1.5 rounded-[1px] bg-primary/70" />
            <span className="w-2 h-1.5 rounded-[1px] bg-primary/70" />
            <span className="w-2 h-1.5 rounded-[1px] bg-primary/70" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const FilmSculptureCanvas: React.FC<FilmSculptureCanvasProps> = ({ className }) => {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = React.useState<boolean | null>(null);
  const pointerTarget = React.useRef({ x: 0, y: 0 });
  const pointerCurrent = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const supported = isWebGLAvailable();
    setWebglSupported(supported);
    if (!supported || !mountRef.current) return;

    const container = mountRef.current;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x101113, 0.065);

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0.4, 0.2, 8.2);

    // 2. Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    const domCanvas = renderer.domElement;
    domCanvas.setAttribute("data-testid", "film-sculpture-webgl-canvas");
    domCanvas.style.width = "100%";
    domCanvas.style.height = "100%";
    domCanvas.style.display = "block";
    container.innerHTML = "";
    container.appendChild(domCanvas);

    // 3. Root Sculpture Group
    const sculptureGroup = new THREE.Group();
    sculptureGroup.position.set(1.15, 0.05, 0);
    sculptureGroup.rotation.set(0.22, -0.38, 0.12);
    scene.add(sculptureGroup);

    // Materials
    const amberGoldMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#E9B457"),
      metalness: 0.88,
      roughness: 0.22,
      emissive: new THREE.Color("#5A3E12"),
      emissiveIntensity: 0.35,
    });

    const gunmetalMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1E2025"),
      metalness: 0.82,
      roughness: 0.28,
    });

    const celluloidFrameMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#16181D"),
      metalness: 0.35,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      reflectivity: 0.9,
      side: THREE.DoubleSide,
    });

    const glowingGateMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#F3C778"),
      emissive: new THREE.Color("#E9B457"),
      emissiveIntensity: 0.75,
      metalness: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide,
    });

    // 4. Concentric Anamorphic Lens & Reel Rings
    const outerRingGeo = new THREE.TorusGeometry(2.35, 0.032, 24, 128);
    const outerRing = new THREE.Mesh(outerRingGeo, amberGoldMaterial);
    outerRing.rotation.x = Math.PI * 0.32;
    sculptureGroup.add(outerRing);

    const midRingGeo = new THREE.TorusGeometry(1.82, 0.055, 20, 96);
    const midRing = new THREE.Mesh(midRingGeo, gunmetalMaterial);
    midRing.rotation.x = -Math.PI * 0.26;
    midRing.rotation.y = Math.PI * 0.18;
    sculptureGroup.add(midRing);

    const innerApertureGeo = new THREE.TorusGeometry(1.22, 0.022, 16, 80);
    const innerAperture = new THREE.Mesh(innerApertureGeo, amberGoldMaterial);
    innerAperture.rotation.y = Math.PI * 0.42;
    sculptureGroup.add(innerAperture);

    // 5. Helical 35mm Cinema Film-Frame Sculpture (14 suspended widescreen cinema gates + sprocket rails)
    const filmRibbonGroup = new THREE.Group();
    sculptureGroup.add(filmRibbonGroup);

    const frameCount = 14;
    const frameOuterGeo = new THREE.BoxGeometry(1.12, 0.68, 0.028);
    const frameScreenGeo = new THREE.PlaneGeometry(0.92, 0.46);
    const sprocketGeo = new THREE.BoxGeometry(0.06, 0.035, 0.036);

    for (let i = 0; i < frameCount; i++) {
      const t = i / frameCount;
      const angle = t * Math.PI * 2;
      const radius = 2.05 + Math.sin(angle * 2) * 0.28;
      const y = Math.cos(angle) * 1.18;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * 0.78;

      const frameHolder = new THREE.Group();
      frameHolder.position.set(x, y, z);
      frameHolder.lookAt(0, y * 0.35, 0);
      frameHolder.rotateY(Math.PI * 0.5);
      frameHolder.rotateZ(Math.sin(angle) * 0.18);

      // Outer celluloid slate
      const slateMesh = new THREE.Mesh(frameOuterGeo, celluloidFrameMaterial);
      frameHolder.add(slateMesh);

      // Inner luminous cinema gate (every 3rd frame glows brighter like a keyframe)
      const isKeyframe = i % 3 === 0;
      const screenMat = isKeyframe
        ? glowingGateMaterial
        : new THREE.MeshStandardMaterial({
            color: new THREE.Color("#282B32"),
            emissive: new THREE.Color("#E9B457"),
            emissiveIntensity: 0.14,
            metalness: 0.65,
            roughness: 0.25,
            side: THREE.DoubleSide,
          });
      const screenMesh = new THREE.Mesh(frameScreenGeo, screenMat);
      screenMesh.position.z = 0.018;
      frameHolder.add(screenMesh);

      // Top & bottom brass sprocket perforations
      for (let s = -2; s <= 2; s++) {
        const topSprocket = new THREE.Mesh(sprocketGeo, amberGoldMaterial);
        topSprocket.position.set(s * 0.2, 0.285, 0.005);
        frameHolder.add(topSprocket);

        const bottomSprocket = new THREE.Mesh(sprocketGeo, amberGoldMaterial);
        bottomSprocket.position.set(s * 0.2, -0.285, 0.005);
        frameHolder.add(bottomSprocket);
      }

      filmRibbonGroup.add(frameHolder);
    }

    // 6. Central Anamorphic Core Prism
    const coreGeo = new THREE.OctahedronGeometry(0.52, 2);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#E9B457"),
      metalness: 0.9,
      roughness: 0.12,
      clearcoat: 1,
      wireframe: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    sculptureGroup.add(coreMesh);

    // 7. Volumetric Dust Motes in Projector Beam
    const particleCount = 160;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.35) * 9;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: new THREE.Color("#F3C778"),
      size: 0.042,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 8. Studio Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.PointLight(0xe9b457, 18, 16);
    keyLight.position.set(3.8, 2.6, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xf3c778, 12, 14);
    rimLight.position.set(-3.5, -1.8, 3.2);
    scene.add(rimLight);

    const coolBackLight = new THREE.DirectionalLight(0x5b7cfa, 1.6);
    coolBackLight.position.set(-4, 3, -5);
    scene.add(coolBackLight);

    // 9. Pointer Interaction Listener
    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointerTarget.current.x = Math.max(-1, Math.min(1, nx));
      pointerTarget.current.y = Math.max(-1, Math.min(1, ny));
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // 10. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 300);
      const h = Math.max(container.clientHeight, 300);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 11. Animation Loop
    let rafId = 0;
    let framesRendered = 0;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const elapsed = clock.getElapsedTime();

      // Smooth spring-like damping toward pointer target
      pointerCurrent.current.x += (pointerTarget.current.x - pointerCurrent.current.x) * 0.075;
      pointerCurrent.current.y += (pointerTarget.current.y - pointerCurrent.current.y) * 0.075;

      const px = pointerCurrent.current.x;
      const py = pointerCurrent.current.y;

      if (!prefersReducedMotion) {
        filmRibbonGroup.rotation.y = elapsed * 0.22 + px * 0.55;
        filmRibbonGroup.rotation.x = Math.sin(elapsed * 0.35) * 0.14 + py * 0.38;

        outerRing.rotation.z = elapsed * 0.15 + px * 0.25;
        midRing.rotation.y = -elapsed * 0.24 + py * 0.3;
        innerAperture.rotation.x = elapsed * 0.32 - px * 0.35;
        coreMesh.rotation.y = -elapsed * 0.45 + px * 0.5;
        coreMesh.rotation.x = elapsed * 0.3 + py * 0.4;

        particles.rotation.y = elapsed * 0.04 + px * 0.12;
      }

      // Camera depth parallax
      camera.position.x = 0.4 + px * 0.55;
      camera.position.y = 0.2 + py * 0.38;
      camera.lookAt(0.65, 0.02, 0);

      keyLight.position.x = 3.8 + px * 1.8;
      keyLight.position.y = 2.6 + py * 1.4;

      renderer.render(scene, camera);
      framesRendered += 1;

      (window as unknown as Record<string, unknown>).__STUDIO_NOIR_SCULPTURE__ = {
        framesRendered,
        pointerX: Number(px.toFixed(3)),
        pointerY: Number(py.toFixed(3)),
        ribbonRotationY: Number(filmRibbonGroup.rotation.y.toFixed(3)),
        cameraX: Number(camera.position.x.toFixed(3)),
        cameraY: Number(camera.position.y.toFixed(3)),
      };

      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handlePointerMove);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  if (webglSupported === false) {
    return <FilmSculptureFallback className={className} />;
  }

  return (
    <div
      ref={mountRef}
      data-testid="film-sculpture-container"
      data-webgl-ready={webglSupported ? "true" : "initializing"}
      className={cn("relative w-full h-full overflow-hidden", className)}
    />
  );
};

export default FilmSculptureCanvas;


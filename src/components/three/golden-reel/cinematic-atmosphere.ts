import * as THREE from "three";

/** Atmosphere lives behind the mechanism; never alters the ribbon or spindle. */
export function createCinematicAtmosphere() {
  const group = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const glow = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  glow.addColorStop(0, "rgba(255,181,70,.32)");
  glow.addColorStop(.35, "rgba(174,93,24,.17)");
  glow.addColorStop(1, "rgba(61,29,8,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .65 });
  const haze: THREE.Sprite[] = [];
  for (let i = 0; i < 5; i++) {
    const sprite = new THREE.Sprite(material);
    sprite.position.set(-2 + i * 1.1, .2 + Math.sin(i * 2) * 1.4, -3.5);
    sprite.scale.set(5, 6, 1); group.add(sprite); haze.push(sprite);
  }
  const groundGeometry = new THREE.PlaneGeometry(24, 22);
  const groundMaterial = new THREE.MeshBasicMaterial({ color: "#100c07", transparent: true, opacity: .55 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -2.65;
  group.add(ground);
  const positions = new Float32Array(90 * 3);
  for (let i = 0; i < 90; i++) {
    positions[i * 3] = Math.sin(i * 127.1) * 5;
    positions[i * 3 + 1] = Math.cos(i * 43.7) * 3;
    positions[i * 3 + 2] = -3 + (i % 13) / 4;
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particlesMaterial = new THREE.PointsMaterial({ color: "#ffd18a", size: .012, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending });
  const particles = new THREE.Points(particlesGeometry, particlesMaterial); group.add(particles);
  return {
    group,
    update(time: number) {
      particles.rotation.z = Math.sin(time * .04) * .08;
      particles.position.y = Math.sin(time * .15) * .12;
      haze.forEach((sprite, i) => { sprite.position.x = -2 + i * 1.1 + Math.sin(time * .09 + i) * .18; });
    },
    dispose() { texture.dispose(); material.dispose(); groundGeometry.dispose(); groundMaterial.dispose(); particlesGeometry.dispose(); particlesMaterial.dispose(); },
  };
}

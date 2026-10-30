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
    sprite.position.set(-.3 + i * 1.0, 1.5 + Math.sin(i * 2) * 1.4, -3.5);
    sprite.scale.set(5, 6, 1); group.add(sprite); haze.push(sprite);
  }
  const groundGeometry = new THREE.PlaneGeometry(24, 22);
  const groundMaterial = new THREE.MeshBasicMaterial({ color: "#100c07", transparent: true, opacity: .55 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.22;
  // Fade the floor away into darkness, avoiding a rectangular stage horizon.
  const floorCanvas = document.createElement("canvas"); floorCanvas.width = floorCanvas.height = 256;
  const floorContext = floorCanvas.getContext("2d")!;
  const fade = floorContext.createRadialGradient(128, 128, 0, 128, 128, 128);
  fade.addColorStop(0, "rgba(255,255,255,.8)"); fade.addColorStop(1, "rgba(255,255,255,0)");
  floorContext.fillStyle = fade; floorContext.fillRect(0, 0, 256, 256);
  const floorTexture = new THREE.CanvasTexture(floorCanvas);
  groundMaterial.map = floorTexture; groundMaterial.depthWrite = false;
  group.add(ground);
  const contactMaterial = new THREE.MeshBasicMaterial({ map: floorTexture, color: "#000000", transparent: true, opacity: .8, depthWrite: false });
  const contactGeometry = new THREE.PlaneGeometry(4.8, 2.8);
  const contact = new THREE.Mesh(contactGeometry, contactMaterial);
  contact.rotation.x = -Math.PI / 2; contact.position.set(-.6, -1.21, -2);
  group.add(contact);
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
      haze.forEach((sprite, i) => { sprite.position.x = -.3 + i * 1.0 + Math.sin(time * .09 + i) * .18; });
    },
    dispose() { texture.dispose(); material.dispose(); floorTexture.dispose(); contactGeometry.dispose(); contactMaterial.dispose(); groundGeometry.dispose(); groundMaterial.dispose(); particlesGeometry.dispose(); particlesMaterial.dispose(); },
  };
}

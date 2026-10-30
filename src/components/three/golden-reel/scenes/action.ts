import { GenreDefinition } from "../types";

export const actionScene: GenreDefinition = {
  id: "action",
  title: "Action",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    // Progress is 0.0 -> 1.0 over 4.0s
    // Coordinate space: (0, 0) top-left, (width, height) bottom-right
    const groundY = height * 0.82;
    const centerX = width * 0.52;

    ctx.save();

    // 1. Warm cinematic backlight inside the frame
    const bgGrad = ctx.createRadialGradient(
      centerX,
      height * 0.45,
      width * 0.05,
      centerX,
      height * 0.5,
      width * 0.65
    );
    bgGrad.addColorStop(0, "#FFF7E6");
    bgGrad.addColorStop(0.45, "#FCE4B8");
    bgGrad.addColorStop(0.85, "#E2BE82");
    bgGrad.addColorStop(1, "#9E7B3E");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle atmospheric dust/grain motes
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.beginPath();
    ctx.arc(width * 0.35, height * 0.32, 2.5, 0, Math.PI * 2);
    ctx.arc(width * 0.65, height * 0.28, 2.0, 0, Math.PI * 2);
    ctx.arc(width * 0.52, height * 0.40, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Ground line / floor
    ctx.fillStyle = "#111317";
    ctx.beginPath();
    ctx.rect(0, groundY, width, height - groundY);
    ctx.fill();

    // Characters silhouette color
    ctx.fillStyle = "#0E1014";
    ctx.strokeStyle = "#0E1014";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Timing phases:
    // 0.0 - 0.25: Stance pulse, Fighter A steps forward
    // 0.25 - 0.55: Fighter A leaps & executes spinning high kick; Fighter B ducks low and slips back
    // 0.55 - 0.80: Fighter A lands decisively, Fighter B recovers into coiled counter stance
    // 0.80 - 1.00: Settle and hold final balanced standoff

    let aX = width * 0.32;
    let aY = groundY;
    let aKickHeight = 0;
    let aLegAngle = 0;

    let bX = width * 0.68;
    let bDuck = 0;

    if (progress < 0.25) {
      const p = progress / 0.25;
      aX = width * 0.30 + p * width * 0.06;
      bX = width * 0.70 - p * width * 0.02;
    } else if (progress < 0.55) {
      const p = (progress - 0.25) / 0.30;
      // Kick apex at p = 0.5
      const arc = Math.sin(p * Math.PI);
      aX = width * 0.36 + p * width * 0.10;
      aY = groundY - arc * height * 0.12;
      aKickHeight = arc;
      aLegAngle = p * Math.PI * 0.9;
      // Defender duck
      bDuck = Math.sin(p * Math.PI) * 0.75;
      bX = width * 0.68 + p * width * 0.06;
    } else if (progress < 0.80) {
      const p = (progress - 0.55) / 0.25;
      aX = width * 0.46 - p * width * 0.04;
      aY = groundY;
      bX = width * 0.74 + (1 - p) * width * 0.01;
      bDuck = (1 - p) * 0.2;
    } else {
      aX = width * 0.42;
      aY = groundY;
      bX = width * 0.74;
      bDuck = 0;
    }

    // DRAW FIGHTER A (Attacker, Left)
    ctx.save();
    ctx.translate(aX, aY);

    // Torso & Hips
    const aLean = progress >= 0.25 && progress < 0.55 ? 0.25 : -0.05;
    ctx.rotate(aLean);

    // Head
    ctx.beginPath();
    ctx.arc(0, -height * 0.42, height * 0.048, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    ctx.lineWidth = width * 0.042;
    ctx.beginPath();
    ctx.moveTo(0, -height * 0.36);
    ctx.lineTo(width * 0.015, -height * 0.18);
    ctx.stroke();

    if (aKickHeight > 0.1) {
      // Dynamic Flying Kick Pose
      // Left Support Leg (tucked in air)
      ctx.lineWidth = width * 0.028;
      ctx.beginPath();
      ctx.moveTo(width * 0.01, -height * 0.18);
      ctx.lineTo(-width * 0.04, -height * 0.10);
      ctx.lineTo(-width * 0.02, -height * 0.04);
      ctx.stroke();

      // Right Striking Leg (extended high over defender)
      ctx.lineWidth = width * 0.032;
      ctx.beginPath();
      ctx.moveTo(width * 0.015, -height * 0.18);
      ctx.lineTo(width * 0.12, -height * 0.28);
      ctx.lineTo(width * 0.26, -height * 0.36);
      ctx.stroke();

      // Striking Foot
      ctx.beginPath();
      ctx.ellipse(width * 0.27, -height * 0.37, width * 0.028, height * 0.014, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Arms in mid-air martial guard
      ctx.lineWidth = width * 0.024;
      ctx.beginPath();
      ctx.moveTo(-width * 0.01, -height * 0.34);
      ctx.lineTo(-width * 0.08, -height * 0.26);
      ctx.lineTo(-width * 0.05, -height * 0.20);
      ctx.moveTo(width * 0.01, -height * 0.34);
      ctx.lineTo(width * 0.06, -height * 0.30);
      ctx.lineTo(width * 0.12, -height * 0.24);
      ctx.stroke();
    } else {
      // Grounded Stance Pose
      ctx.lineWidth = width * 0.030;
      // Front leg (bent forward)
      ctx.beginPath();
      ctx.moveTo(width * 0.015, -height * 0.18);
      ctx.lineTo(width * 0.06, -height * 0.09);
      ctx.lineTo(width * 0.09, 0);
      ctx.stroke();
      // Back leg (braced)
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(-width * 0.06, -height * 0.09);
      ctx.lineTo(-width * 0.09, 0);
      ctx.stroke();

      // Guard Arms
      ctx.lineWidth = width * 0.024;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.34);
      ctx.lineTo(width * 0.08, -height * 0.28);
      ctx.lineTo(width * 0.11, -height * 0.34);
      ctx.moveTo(-width * 0.01, -height * 0.34);
      ctx.lineTo(-width * 0.04, -height * 0.25);
      ctx.lineTo(width * 0.02, -height * 0.23);
      ctx.stroke();
    }
    ctx.restore();

    // DRAW FIGHTER B (Defender, Right)
    ctx.save();
    ctx.translate(bX, groundY);

    const bHeadY = -height * 0.42 + bDuck * height * 0.18;
    const bTorsoY = -height * 0.36 + bDuck * height * 0.16;
    const bHipY = -height * 0.18 + bDuck * height * 0.10;

    // Head
    ctx.beginPath();
    ctx.arc(0, bHeadY, height * 0.046, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    ctx.lineWidth = width * 0.040;
    ctx.beginPath();
    ctx.moveTo(0, bTorsoY);
    ctx.lineTo(-width * 0.01, bHipY);
    ctx.stroke();

    if (bDuck > 0.2) {
      // Ducking & Slipping Pose under kick
      ctx.lineWidth = width * 0.032;
      // Deep crouch legs
      ctx.beginPath();
      ctx.moveTo(-width * 0.01, bHipY);
      ctx.lineTo(-width * 0.08, -height * 0.07);
      ctx.lineTo(-width * 0.11, 0);
      ctx.moveTo(width * 0.01, bHipY);
      ctx.lineTo(width * 0.08, -height * 0.08);
      ctx.lineTo(width * 0.10, 0);
      ctx.stroke();

      // Defensive upward forearm block
      ctx.lineWidth = width * 0.024;
      ctx.beginPath();
      ctx.moveTo(-width * 0.02, bTorsoY);
      ctx.lineTo(-width * 0.09, bTorsoY - height * 0.04);
      ctx.lineTo(-width * 0.04, bTorsoY - height * 0.10);
      ctx.moveTo(width * 0.02, bTorsoY);
      ctx.lineTo(width * 0.06, bTorsoY - height * 0.02);
      ctx.stroke();
    } else {
      // Alert Coiled Counter Stance
      ctx.lineWidth = width * 0.030;
      ctx.beginPath();
      ctx.moveTo(-width * 0.01, bHipY);
      ctx.lineTo(-width * 0.07, -height * 0.09);
      ctx.lineTo(-width * 0.09, 0);
      ctx.moveTo(width * 0.01, bHipY);
      ctx.lineTo(width * 0.05, -height * 0.09);
      ctx.lineTo(width * 0.08, 0);
      ctx.stroke();

      // Raised Ready Hands
      ctx.lineWidth = width * 0.024;
      ctx.beginPath();
      ctx.moveTo(-width * 0.02, bTorsoY);
      ctx.lineTo(-width * 0.09, -height * 0.32);
      ctx.lineTo(-width * 0.07, -height * 0.38);
      ctx.moveTo(width * 0.02, bTorsoY);
      ctx.lineTo(width * 0.05, -height * 0.30);
      ctx.lineTo(width * 0.03, -height * 0.36);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  },
};


import { GenreDefinition } from "../types";

export const chaseScene: GenreDefinition = {
  id: "chase",
  title: "Thriller / Chase",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const roadY = height * 0.72;
    const roadHeight = height * 0.22;

    ctx.save();

    // Night city cinematic sky (cool cyan-slate backlight)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, roadY);
    skyGrad.addColorStop(0, "#08101C");
    skyGrad.addColorStop(0.55, "#1B2A3D");
    skyGrad.addColorStop(1, "#385672");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Distant city skyline silhouettes
    ctx.fillStyle = "#0D141F";
    ctx.beginPath();
    // Skyscraper blocks
    ctx.rect(width * 0.05, roadY - height * 0.32, width * 0.09, height * 0.32);
    ctx.rect(width * 0.16, roadY - height * 0.42, width * 0.08, height * 0.42);
    ctx.rect(width * 0.26, roadY - height * 0.26, width * 0.12, height * 0.26);
    ctx.rect(width * 0.40, roadY - height * 0.36, width * 0.07, height * 0.36);
    ctx.rect(width * 0.49, roadY - height * 0.48, width * 0.09, height * 0.48);
    ctx.rect(width * 0.60, roadY - height * 0.30, width * 0.11, height * 0.30);
    ctx.rect(width * 0.73, roadY - height * 0.40, width * 0.08, height * 0.40);
    ctx.rect(width * 0.83, roadY - height * 0.34, width * 0.12, height * 0.34);
    ctx.fill();

    // Road surface
    ctx.fillStyle = "#0A0C10";
    ctx.fillRect(0, roadY, width, height - roadY);

    // Moving dashed white lane markings on road
    ctx.fillStyle = "#A8C0D8";
    const dashLength = width * 0.08;
    const dashGap = width * 0.06;
    const dashCycle = dashLength + dashGap;
    // Road speed: dashes move rapidly to the left to simulate forward speed
    const roadSpeed = width * 1.8; // px per second
    const roadOffset = (progress * 4.0 * roadSpeed) % dashCycle;

    for (let x = -dashCycle; x < width + dashCycle; x += dashCycle) {
      ctx.fillRect(x - roadOffset, roadY + roadHeight * 0.45, dashLength, height * 0.02);
    }

    // Streetlamp posts passing by
    const lampCycle = width * 0.6;
    const lampOffset = (progress * 4.0 * roadSpeed * 0.8) % lampCycle;
    ctx.fillStyle = "#06080C";
    ctx.fillRect(width * 0.8 - lampOffset, roadY - height * 0.35, width * 0.012, height * 0.35);
    ctx.fillRect(width * 0.75 - lampOffset, roadY - height * 0.35, width * 0.07, height * 0.015);

    // CAR 1: Lead Vintage Fastback Coupe
    // Progress: enters from left, accelerates across, settles toward right-center
    let car1X = 0;
    if (progress < 0.30) {
      const p = progress / 0.30;
      car1X = -width * 0.25 + p * (width * 0.85);
    } else {
      const p = (progress - 0.30) / 0.70;
      car1X = width * 0.60 + Math.sin(p * Math.PI * 4) * width * 0.02;
    }

    // CAR 2: Pursuing Sedan
    // Follows behind Car 1 with engine surge
    let car2X = 0;
    if (progress < 0.45) {
      const p = progress / 0.45;
      car2X = -width * 0.40 + p * (width * 0.65);
    } else {
      const p = (progress - 0.45) / 0.55;
      car2X = width * 0.25 + Math.sin(p * Math.PI * 3 + 1.2) * width * 0.03;
    }

    const wheelRadius = height * 0.045;
    const carTravelDistance = progress * 4.0 * roadSpeed;
    const wheelAngle = carTravelDistance / wheelRadius;

    // Helper: Draw spinning spoked wheel
    const drawWheel = (wx: number, wy: number) => {
      ctx.save();
      ctx.translate(wx, wy);

      // Tire
      ctx.fillStyle = "#0A0C10";
      ctx.beginPath();
      ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
      ctx.fill();

      // Rim
      ctx.strokeStyle = "#4A5868";
      ctx.lineWidth = wheelRadius * 0.25;
      ctx.beginPath();
      ctx.arc(0, 0, wheelRadius * 0.75, 0, Math.PI * 2);
      ctx.stroke();

      // Spokes rotating consistently with car travel speed
      ctx.strokeStyle = "#7B8E9F";
      ctx.lineWidth = 1.8;
      ctx.rotate(wheelAngle);
      for (let s = 0; s < 4; s++) {
        ctx.beginPath();
        ctx.moveTo(-wheelRadius * 0.65, 0);
        ctx.lineTo(wheelRadius * 0.65, 0);
        ctx.stroke();
        ctx.rotate(Math.PI / 4);
      }
      ctx.restore();
    };

    // Draw Lead Car (Fastback Coupe)
    const drawLeadCar = (x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);

      const carW = width * 0.32;
      const carH = height * 0.14;

      // Silhouette chassis
      ctx.fillStyle = "#07080A";
      ctx.beginPath();
      ctx.moveTo(-carW * 0.48, -carH * 0.15); // rear bumper
      ctx.lineTo(-carW * 0.45, -carH * 0.45); // trunk
      ctx.lineTo(-carW * 0.22, -carH * 0.85); // fastback rear window
      ctx.lineTo(carW * 0.08, -carH * 0.90);  // roof
      ctx.lineTo(carW * 0.22, -carH * 0.45);  // windshield
      ctx.lineTo(carW * 0.46, -carH * 0.40);  // hood
      ctx.lineTo(carW * 0.49, -carH * 0.15);  // nose
      ctx.lineTo(carW * 0.46, -carH * 0.05);  // front air dam
      ctx.lineTo(-carW * 0.48, -carH * 0.05); // underside
      ctx.closePath();
      ctx.fill();

      // Driver silhouette in window
      ctx.fillStyle = "#020304";
      ctx.beginPath();
      ctx.arc(-carW * 0.02, -carH * 0.65, carH * 0.16, 0, Math.PI * 2);
      ctx.fill();

      // Headlight glow casting forward
      const beamGrad = ctx.createRadialGradient(
        carW * 0.48,
        -carH * 0.30,
        5,
        carW * 0.85,
        -carH * 0.15,
        width * 0.18
      );
      beamGrad.addColorStop(0, "rgba(255, 235, 180, 0.45)");
      beamGrad.addColorStop(1, "rgba(255, 235, 180, 0.0)");
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(carW * 0.48, -carH * 0.30);
      ctx.lineTo(carW * 0.95, -carH * 0.50);
      ctx.lineTo(carW * 0.95, 0);
      ctx.closePath();
      ctx.fill();

      // Wheels
      drawWheel(-carW * 0.28, 0);
      drawWheel(carW * 0.28, 0);

      ctx.restore();
    };

    // Draw Chaser Car (Interceptor Sedan)
    const drawChaserCar = (x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);

      const carW = width * 0.34;
      const carH = height * 0.15;

      ctx.fillStyle = "#040507";
      ctx.beginPath();
      ctx.moveTo(-carW * 0.48, -carH * 0.15);
      ctx.lineTo(-carW * 0.42, -carH * 0.50);
      ctx.lineTo(-carW * 0.25, -carH * 0.50);
      ctx.lineTo(-carW * 0.14, -carH * 0.92); // boxy rear pillar
      ctx.lineTo(carW * 0.12, -carH * 0.92);  // roof
      ctx.lineTo(carW * 0.26, -carH * 0.50);  // steep windshield
      ctx.lineTo(carW * 0.48, -carH * 0.46);  // long hood
      ctx.lineTo(carW * 0.50, -carH * 0.15);  // grille
      ctx.lineTo(carW * 0.48, -carH * 0.05);
      ctx.lineTo(-carW * 0.48, -carH * 0.05);
      ctx.closePath();
      ctx.fill();

      // Police roof light bar / antenna silhouette
      ctx.fillRect(-carW * 0.04, -carH * 1.05, carW * 0.08, carH * 0.13);

      // Wheels
      drawWheel(-carW * 0.29, 0);
      drawWheel(carW * 0.29, 0);

      ctx.restore();
    };

    drawChaserCar(car2X, roadY);
    drawLeadCar(car1X, roadY);

    ctx.restore();
  },
};


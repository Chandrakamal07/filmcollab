import { GenreDefinition } from "../types";

export const chaseScene: GenreDefinition = {
  id: "chase",
  title: "Thriller / Chase",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const roadY = height * 0.74;

    ctx.save();

    // Noir moonlight / stormy indigo backlight
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#D6E4FF");
    bgGrad.addColorStop(0.35, "#8FAECF");
    bgGrad.addColorStop(0.70, "#3B577D");
    bgGrad.addColorStop(1, "#131D2D");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // City skyline silhouettes in the far background
    ctx.fillStyle = "#1E293B";
    const skyX = [0.05, 0.14, 0.22, 0.35, 0.45, 0.58, 0.70, 0.82, 0.92];
    const skyW = [0.08, 0.07, 0.11, 0.09, 0.12, 0.10, 0.09, 0.09, 0.07];
    const skyH = [0.28, 0.40, 0.32, 0.48, 0.36, 0.44, 0.30, 0.42, 0.34];
    for (let i = 0; i < skyX.length; i++) {
      ctx.fillRect(
        width * skyX[i],
        roadY - height * skyH[i],
        width * skyW[i],
        height * skyH[i]
      );
    }

    // Asphalt road surface with clear contrast from dark surround
    ctx.fillStyle = "#1B1F27";
    ctx.fillRect(0, roadY, width, height - roadY);

    // Road curb highlight line
    ctx.fillStyle = "#333A48";
    ctx.fillRect(0, roadY, width, 3);

    // Moving dashed road lane divider
    // Continuous travel based on progress
    const roadSpeed = 1600; // pixels per cycle
    const dashTravel = (progress * roadSpeed) % 80;
    ctx.fillStyle = "#E2B852"; // warm amber road dashes
    for (let x = -80 + dashTravel; x < width + 80; x += 80) {
      ctx.fillRect(x, roadY + (height - roadY) * 0.45, 45, 4);
    }

    // Two vintage vehicles:
    // Pursuit Car (Police/Interceptor, Left) and Target Car (Vintage Coupe, Right)
    // Spacing between cars dynamically modulates without sudden teleporting
    const spacingPulse = Math.sin(progress * Math.PI * 2) * (width * 0.04);
    const car1X = width * 0.26 + spacingPulse; // Pursuit
    const car2X = width * 0.68 - spacingPulse * 0.5; // Lead

    // Wheel rotation angle derived from total road distance + car movement
    const wheelRadius = height * 0.072; // ~20px

    const drawVintageCar = (
      cx: number,
      cy: number,
      carW: number,
      carH: number,
      isPolice: boolean,
      carSpeedOffset: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);

      // Car body silhouette in rich charcoal
      ctx.fillStyle = "#090A0D";

      ctx.beginPath();
      // Rear bumper
      ctx.moveTo(-carW * 0.50, 0);
      // Trunk line
      ctx.lineTo(-carW * 0.50, -carH * 0.35);
      ctx.lineTo(-carW * 0.32, -carH * 0.40);
      // Rear windshield
      ctx.lineTo(-carW * 0.20, -carH * 0.88);
      // Roof
      ctx.lineTo(carW * 0.12, -carH * 0.90);
      // Front windshield
      ctx.lineTo(carW * 0.26, -carH * 0.42);
      // Hood line
      ctx.lineTo(carW * 0.48, -carH * 0.38);
      // Front grille
      ctx.lineTo(carW * 0.50, 0);
      ctx.closePath();
      ctx.fill();

      // Police beacon on roof
      if (isPolice) {
        ctx.fillStyle = (progress * 12) % 2 < 1 ? "#FF3B30" : "#0A84FF";
        ctx.fillRect(-carW * 0.04, -carH * 1.05, carW * 0.08, carH * 0.15);
      }

      // Windows (cutouts with pale cabin glow)
      ctx.fillStyle = "#6B7C96";
      // Side window rear
      ctx.beginPath();
      ctx.moveTo(-carW * 0.16, -carH * 0.82);
      ctx.lineTo(-carW * 0.03, -carH * 0.84);
      ctx.lineTo(-carW * 0.03, -carH * 0.46);
      ctx.lineTo(-carW * 0.22, -carH * 0.46);
      ctx.closePath();
      ctx.fill();

      // Side window front
      ctx.beginPath();
      ctx.moveTo(carW * 0.01, -carH * 0.84);
      ctx.lineTo(carW * 0.10, -carH * 0.84);
      ctx.lineTo(carW * 0.22, -carH * 0.46);
      ctx.lineTo(carW * 0.01, -carH * 0.46);
      ctx.closePath();
      ctx.fill();

      // Headlight beam cone projecting forward
      const beamGrad = ctx.createLinearGradient(carW * 0.50, -carH * 0.20, carW * 1.4, -carH * 0.10);
      beamGrad.addColorStop(0, "rgba(255, 240, 200, 0.45)");
      beamGrad.addColorStop(1, "rgba(255, 240, 200, 0.0)");
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(carW * 0.50, -carH * 0.25);
      ctx.lineTo(carW * 1.4, -carH * 0.50);
      ctx.lineTo(carW * 1.4, carH * 0.15);
      ctx.lineTo(carW * 0.50, -carH * 0.10);
      ctx.closePath();
      ctx.fill();

      // Rotating Spoked Wheels
      const totalDist = progress * roadSpeed + carSpeedOffset;
      const wheelAngle = totalDist / wheelRadius;

      const drawSpokedWheel = (wx: number, wy: number) => {
        ctx.save();
        ctx.translate(wx, wy);

        // Tire (black rubber)
        ctx.fillStyle = "#0A0B0E";
        ctx.beginPath();
        ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
        ctx.fill();

        // Rim (steel/chrome)
        ctx.fillStyle = "#A8B4C4";
        ctx.beginPath();
        ctx.arc(0, 0, wheelRadius * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Center hub
        ctx.fillStyle = "#1E222A";
        ctx.beginPath();
        ctx.arc(0, 0, wheelRadius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // 6 Spokes rotating with wheel travel
        ctx.rotate(wheelAngle);
        ctx.strokeStyle = "#1E222A";
        ctx.lineWidth = 2.5;
        for (let s = 0; s < 6; s++) {
          const ang = (s * Math.PI * 2) / 6;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang) * wheelRadius * 0.65, Math.sin(ang) * wheelRadius * 0.65);
          ctx.stroke();
        }

        ctx.restore();
      };

      drawSpokedWheel(-carW * 0.28, 0);
      drawSpokedWheel(carW * 0.32, 0);

      ctx.restore();
    };

    const carHeight = height * 0.22;
    const carWidth = carHeight * 2.3;

    drawVintageCar(car1X, roadY, carWidth, carHeight, true, spacingPulse);
    drawVintageCar(car2X, roadY, carWidth, carHeight, false, -spacingPulse * 0.5);

    ctx.restore();
  },
};

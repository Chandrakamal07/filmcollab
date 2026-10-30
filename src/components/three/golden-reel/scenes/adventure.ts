import { GenreDefinition } from "../types";

export const adventureScene: GenreDefinition = {
  id: "adventure",
  title: "Adventure / Explorer",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    ctx.save();

    // Epic golden-hour mountain vista backlight
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#FFF3D6");
    bgGrad.addColorStop(0.35, "#FFD58C");
    bgGrad.addColorStop(0.70, "#E89B54");
    bgGrad.addColorStop(1, "#662B16");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Distant jagged mountain ridges
    ctx.fillStyle = "#1D1614";
    ctx.beginPath();
    ctx.moveTo(0, height * 0.70);
    ctx.lineTo(width * 0.20, height * 0.52);
    ctx.lineTo(width * 0.38, height * 0.62);
    ctx.lineTo(width * 0.62, height * 0.44);
    ctx.lineTo(width * 0.85, height * 0.58);
    ctx.lineTo(width, height * 0.48);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Foreground Rocky Terrain & Summit Ledge
    // Left Lower Crag
    const lowerCragX = width * 0.30;
    const lowerCragY = height * 0.78;

    // Right High Summit Ledge
    const ledgeX = width * 0.58;
    const ledgeY = height * 0.46;

    ctx.fillStyle = "#0C0A09";
    ctx.beginPath();
    // Lower left boulder
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.72);
    ctx.lineTo(width * 0.18, height * 0.74);
    ctx.lineTo(lowerCragX, lowerCragY);
    ctx.lineTo(lowerCragX + width * 0.05, height * 0.90);
    ctx.lineTo(lowerCragX + width * 0.12, height);
    ctx.closePath();
    ctx.fill();

    // Higher right summit crag with sheer cliff face
    ctx.beginPath();
    ctx.moveTo(width * 0.46, height);
    ctx.lineTo(width * 0.52, height * 0.85);
    ctx.lineTo(width * 0.56, height * 0.65);
    ctx.lineTo(ledgeX, ledgeY); // Summit ledge edge
    ctx.lineTo(width * 0.82, ledgeY + height * 0.02);
    ctx.lineTo(width, ledgeY + height * 0.06);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Explorer Character Timing:
    // 0.00 - 0.25: Leaps/steps across cavernous chasm from lower crag
    // 0.25 - 0.50: Reaches up, two hands grip the sheer rock ledge, feet scramble on wall
    // 0.50 - 0.75: Powerful athletic pull-up: chest rises over ledge, knee hooks onto summit
    // 0.75 - 1.00: Stands fully upright on the summit, one hand on hip, looking out in heroic triumph

    let charX = lowerCragX;
    let charY = lowerCragY;
    let isClimbing = false;
    let isSummitStanding = false;
    let pullProgress = 0;

    if (progress < 0.25) {
      // Leap across gap toward cliff face
      const p = progress / 0.25;
      charX = lowerCragX + p * (ledgeX - lowerCragX - width * 0.04);
      charY = lowerCragY - Math.sin(p * Math.PI) * height * 0.14 - p * (lowerCragY - (ledgeY + height * 0.20));
    } else if (progress < 0.50) {
      // Hands gripped on ledge, hanging and kicking for purchase
      isClimbing = true;
      charX = ledgeX - width * 0.02;
      charY = ledgeY + height * 0.22;
      pullProgress = 0;
    } else if (progress < 0.75) {
      // Pull-up over ledge
      isClimbing = true;
      pullProgress = (progress - 0.50) / 0.25;
      charX = ledgeX - width * 0.02 + pullProgress * width * 0.12;
      charY = ledgeY + height * 0.22 - pullProgress * height * 0.22;
    } else {
      // Triumphant Summit Pose
      isSummitStanding = true;
      charX = ledgeX + width * 0.14;
      charY = ledgeY;
    }

    // DRAW EXPLORER
    ctx.save();
    ctx.translate(charX, charY);

    ctx.fillStyle = "#0A0807";
    ctx.strokeStyle = "#0A0807";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isSummitStanding) {
      // Heroic Standing Summit Pose
      // Head with brimmed explorer fedora
      ctx.beginPath();
      ctx.arc(0, -height * 0.40, height * 0.046, 0, Math.PI * 2);
      ctx.fill();
      // Hat brim
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-width * 0.04, -height * 0.41);
      ctx.lineTo(width * 0.045, -height * 0.41);
      ctx.stroke();

      // Broad-shouldered torso
      ctx.lineWidth = width * 0.040;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.35);
      ctx.lineTo(0, -height * 0.18);
      ctx.stroke();

      // Backpack silhouette on back
      ctx.beginPath();
      ctx.roundRect(-width * 0.055, -height * 0.34, width * 0.035, height * 0.14, 4);
      ctx.fill();

      // Heroic wide stance legs firmly planted on summit ledge
      ctx.lineWidth = width * 0.030;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(-width * 0.05, -height * 0.09);
      ctx.lineTo(-width * 0.07, 0); // planted back foot

      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(width * 0.04, -height * 0.09);
      ctx.lineTo(width * 0.07, 0); // planted front foot
      ctx.stroke();

      // Arms: One hand on hip, one arm raised surveying the horizon
      ctx.lineWidth = width * 0.022;
      ctx.beginPath();
      // Left arm on hip
      ctx.moveTo(0, -height * 0.34);
      ctx.lineTo(-width * 0.06, -height * 0.26);
      ctx.lineTo(-width * 0.02, -height * 0.20);
      // Right arm extended triumphantly pointing to the sun
      ctx.moveTo(0, -height * 0.34);
      ctx.lineTo(width * 0.08, -height * 0.38);
      ctx.lineTo(width * 0.14, -height * 0.44);
      ctx.stroke();
    } else if (isClimbing) {
      // Rock Climb & Pull-up Pose
      const climbLift = pullProgress * height * 0.16;

      // Head
      ctx.beginPath();
      ctx.arc(width * 0.02, -height * 0.24 - climbLift, height * 0.044, 0, Math.PI * 2);
      ctx.fill();

      // Torso pulled up toward ledge
      ctx.lineWidth = width * 0.038;
      ctx.beginPath();
      ctx.moveTo(width * 0.02, -height * 0.20 - climbLift);
      ctx.lineTo(0, -height * 0.04 - climbLift);
      ctx.stroke();

      // Hands firmly gripping ledge edge (ledge is at local Y: -charY + ledgeY)
      const handY = -charY + ledgeY;
      ctx.lineWidth = width * 0.024;
      ctx.beginPath();
      ctx.moveTo(width * 0.02, -height * 0.20 - climbLift);
      ctx.lineTo(0, handY + height * 0.06);
      ctx.lineTo(width * 0.02, handY); // Gripping ledge
      ctx.moveTo(width * 0.02, -height * 0.20 - climbLift);
      ctx.lineTo(width * 0.06, handY + height * 0.04);
      ctx.lineTo(width * 0.05, handY); // Gripping ledge
      ctx.stroke();

      // Legs kicking/scrambling on rock face or hooking knee
      ctx.lineWidth = width * 0.028;
      ctx.beginPath();
      if (pullProgress > 0.4) {
        // Right leg hooked up onto ledge
        ctx.moveTo(0, -height * 0.04 - climbLift);
        ctx.lineTo(width * 0.06, handY + height * 0.02);
        ctx.lineTo(width * 0.10, handY);
      } else {
        ctx.moveTo(0, -height * 0.04 - climbLift);
        ctx.lineTo(-width * 0.04, height * 0.06);
        ctx.lineTo(-width * 0.02, height * 0.14);
      }
      // Left trailing leg
      ctx.moveTo(0, -height * 0.04 - climbLift);
      ctx.lineTo(width * 0.02, height * 0.08);
      ctx.lineTo(0, height * 0.16);
      ctx.stroke();
    } else {
      // Mid-Air Leap Pose across chasm
      ctx.rotate(-0.25);
      // Head
      ctx.beginPath();
      ctx.arc(0, -height * 0.36, height * 0.044, 0, Math.PI * 2);
      ctx.fill();

      // Torso
      ctx.lineWidth = width * 0.038;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.32);
      ctx.lineTo(0, -height * 0.16);
      ctx.stroke();

      // Reaching Arms
      ctx.lineWidth = width * 0.022;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.30);
      ctx.lineTo(width * 0.10, -height * 0.38);
      ctx.lineTo(width * 0.16, -height * 0.44); // Reaching for cliff
      ctx.stroke();

      // Leaping Stride Legs
      ctx.lineWidth = width * 0.028;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.16);
      ctx.lineTo(width * 0.08, -height * 0.10);
      ctx.lineTo(width * 0.12, 0); // Forward reaching foot
      ctx.moveTo(0, -height * 0.16);
      ctx.lineTo(-width * 0.08, -height * 0.12);
      ctx.lineTo(-width * 0.12, -height * 0.04); // Trailing foot
      ctx.stroke();
    }

    ctx.restore();

    ctx.restore();
  },
};


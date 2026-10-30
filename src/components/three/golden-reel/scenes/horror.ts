import { GenreDefinition } from "../types";

export const horrorScene: GenreDefinition = {
  id: "horror",
  title: "Horror / Suspense",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const floorY = height * 0.82;
    const doorX = width * 0.72;

    ctx.save();

    // Eerie monochromatic pale-green/amber backlight
    const bgGrad = ctx.createRadialGradient(
      doorX,
      height * 0.45,
      width * 0.05,
      doorX,
      height * 0.50,
      width * 0.70
    );
    bgGrad.addColorStop(0, "#F2E8DC");
    bgGrad.addColorStop(0.35, "#D8C7B0");
    bgGrad.addColorStop(0.70, "#6E685C");
    bgGrad.addColorStop(1, "#181A16");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Dark gothic corridor floor
    ctx.fillStyle = "#0A0B09";
    ctx.fillRect(0, floorY, width, height - floorY);

    // Gothic door frame / arch
    const doorW = width * 0.22;
    const doorH = height * 0.58;
    const doorTop = floorY - doorH;

    // Door wall silhouette
    ctx.fillStyle = "#0C0E0B";
    ctx.fillRect(doorX - doorW * 0.1, 0, width - (doorX - doorW * 0.1), height);

    // Archway cutout opening (illuminated from within)
    const doorLightGrad = ctx.createLinearGradient(doorX, 0, doorX + doorW, 0);
    doorLightGrad.addColorStop(0, "#F5EFE6");
    doorLightGrad.addColorStop(1, "#D6C7B2");
    ctx.fillStyle = doorLightGrad;
    ctx.beginPath();
    ctx.moveTo(doorX, floorY);
    ctx.lineTo(doorX, doorTop + doorW * 0.5);
    ctx.arc(doorX + doorW * 0.5, doorTop + doorW * 0.5, doorW * 0.5, Math.PI, 0);
    ctx.lineTo(doorX + doorW, floorY);
    ctx.closePath();
    ctx.fill();

    // Door panel opening inward: angle progresses from 0 to 0.75
    // 0.0 - 0.40: door opens slowly
    let doorOpen = 0;
    if (progress < 0.40) {
      doorOpen = (progress / 0.40) * 0.85;
    } else {
      doorOpen = 0.85;
    }

    // Door slab silhouette
    ctx.fillStyle = "#121511";
    ctx.beginPath();
    ctx.moveTo(doorX, floorY);
    ctx.lineTo(doorX, doorTop);
    const slabW = doorW * Math.cos(doorOpen);
    ctx.lineTo(doorX + slabW, doorTop + height * 0.04 * Math.sin(doorOpen));
    ctx.lineTo(doorX + slabW, floorY - height * 0.02 * Math.sin(doorOpen));
    ctx.closePath();
    ctx.fill();

    // Timing of character and looming shadow:
    // 0.0 - 0.45: Lone investigator creeps toward the doorway with flashlight/candle
    // 0.45 - 0.75: Looming monstrous/tall shadow stretches across the doorway from within
    // 0.75 - 1.00: Investigator freezes, recoils backward, dropping arm in horror

    let charX = width * 0.28;
    let charLean = 0.12; // creeping forward
    let charArmAngle = 0;
    let recoil = 0;

    if (progress < 0.45) {
      const p = progress / 0.45;
      charX = width * 0.25 + p * width * 0.18;
      charLean = 0.12;
      charArmAngle = -0.15;
    } else if (progress < 0.75) {
      const p = (progress - 0.45) / 0.30;
      charX = width * 0.43 - p * width * 0.04;
      charLean = 0.12 - p * 0.30; // starts pulling back
      charArmAngle = -0.15 - p * 0.35; // raises hand defensively
      recoil = p;
    } else {
      const p = (progress - 0.75) / 0.25;
      charX = width * 0.39 - p * width * 0.03;
      charLean = -0.18; // recoiling back
      charArmAngle = -0.50; // hands up in fright
      recoil = 1.0;
    }

    // Looming ominous shadow emerging through the doorway
    if (progress > 0.35) {
      const shadowP = Math.min((progress - 0.35) / 0.35, 1.0);
      ctx.save();
      ctx.fillStyle = "rgba(10, 12, 10, 0.88)";
      ctx.translate(doorX + doorW * 0.45, floorY);

      // Elongated towering shadow body
      const shadowHeight = height * 0.52 * shadowP;
      ctx.beginPath();
      // Ominous hooded / horned head
      ctx.arc(0, -shadowHeight, height * 0.065, 0, Math.PI * 2);
      ctx.fill();

      // Slender tall shoulders and looming torso
      ctx.lineWidth = width * 0.065;
      ctx.strokeStyle = "rgba(10, 12, 10, 0.90)";
      ctx.beginPath();
      ctx.moveTo(0, -shadowHeight);
      ctx.lineTo(0, 0);
      ctx.stroke();

      // Long creeping fingers/arms extending into the room toward character
      ctx.lineWidth = width * 0.022;
      ctx.beginPath();
      ctx.moveTo(-width * 0.03, -shadowHeight * 0.80);
      ctx.lineTo(-width * 0.12 * shadowP, -shadowHeight * 0.60);
      ctx.lineTo(-width * 0.18 * shadowP, -shadowHeight * 0.50);

      ctx.moveTo(width * 0.02, -shadowHeight * 0.80);
      ctx.lineTo(width * 0.08 * shadowP, -shadowHeight * 0.65);
      ctx.stroke();

      ctx.restore();
    }

    // Draw Investigator Character
    ctx.save();
    ctx.translate(charX, floorY);
    ctx.rotate(charLean);

    ctx.fillStyle = "#0A0C09";
    ctx.strokeStyle = "#0A0C09";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Head / fedora / hat
    ctx.beginPath();
    ctx.arc(0, -height * 0.40, height * 0.044, 0, Math.PI * 2);
    ctx.fill();

    // Trenchcoat Torso
    ctx.lineWidth = width * 0.038;
    ctx.beginPath();
    ctx.moveTo(0, -height * 0.35);
    ctx.lineTo(0, -height * 0.18);
    ctx.stroke();

    // Coat flare
    ctx.beginPath();
    ctx.moveTo(-width * 0.02, -height * 0.20);
    ctx.lineTo(width * 0.02, -height * 0.20);
    ctx.lineTo(width * 0.04 - recoil * width * 0.03, -height * 0.06);
    ctx.lineTo(-width * 0.04 - recoil * width * 0.03, -height * 0.06);
    ctx.closePath();
    ctx.fill();

    // Creeping / Bracing Legs
    ctx.lineWidth = width * 0.028;
    ctx.beginPath();
    if (recoil > 0.5) {
      // Braced back in recoil
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(-width * 0.07, -height * 0.08);
      ctx.lineTo(-width * 0.10, 0);
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(width * 0.03, -height * 0.09);
      ctx.lineTo(width * 0.05, 0);
    } else {
      // Cautious forward step
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(width * 0.04, -height * 0.09);
      ctx.lineTo(width * 0.07, 0);
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(-width * 0.04, -height * 0.09);
      ctx.lineTo(-width * 0.06, 0);
    }
    ctx.stroke();

    // Arms: holding lantern / raising in dread
    ctx.lineWidth = width * 0.022;
    ctx.beginPath();
    ctx.moveTo(0, -height * 0.33);
    ctx.lineTo(width * 0.08, -height * 0.26 + charArmAngle * height * 0.25);
    ctx.lineTo(width * 0.11, -height * 0.30 + charArmAngle * height * 0.35);
    ctx.stroke();

    // Lantern hanging from hand
    if (recoil < 0.6) {
      const lanternX = width * 0.11;
      const lanternY = -height * 0.30 + charArmAngle * height * 0.35;
      ctx.fillStyle = "#FFDD99";
      ctx.fillRect(lanternX - 3, lanternY + 6, 6, 9);
      ctx.strokeStyle = "#0A0C09";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(lanternX - 3, lanternY + 6, 6, 9);
      ctx.beginPath();
      ctx.moveTo(lanternX, lanternY);
      ctx.lineTo(lanternX, lanternY + 6);
      ctx.stroke();
    }

    ctx.restore();

    ctx.restore();
  },
};


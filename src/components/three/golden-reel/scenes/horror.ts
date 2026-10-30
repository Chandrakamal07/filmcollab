import { GenreDefinition } from "../types";
import { CharacterPose } from "./rig/pose-types";
import { drawCharacterSilhouette } from "./rig/draw-silhouette";
import { smootherstep } from "./rig/sample-pose";

export const horrorScene: GenreDefinition = {
  id: "horror",
  title: "Horror / Suspense",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const groundY = height * 0.82;
    const charHeight = height * 0.54;

    ctx.save();

    // Cold gothic moonlight with sickly greenish-amber ambient tone
    const bgGrad = ctx.createRadialGradient(
      width * 0.60,
      height * 0.40,
      width * 0.05,
      width * 0.55,
      height * 0.45,
      width * 0.65
    );
    bgGrad.addColorStop(0, "#DDF5E6");
    bgGrad.addColorStop(0.35, "#8EBAA0");
    bgGrad.addColorStop(0.70, "#375442");
    bgGrad.addColorStop(1, "#101F16");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Gothic Stone Wall with Arched Doorway on the right
    const doorX = width * 0.65;
    const doorW = width * 0.22;
    const doorH = height * 0.62;
    const doorY = groundY - doorH;

    // Stone doorway arch frame
    ctx.fillStyle = "#0A0D0A";
    ctx.beginPath();
    ctx.rect(doorX - 10, doorY, doorW + 20, doorH);
    ctx.arc(doorX + doorW * 0.5, doorY, doorW * 0.5 + 10, Math.PI, 0);
    ctx.fill();

    // Door opening perspective:
    // 0.00 - 0.35: Closed door with cracked seam
    // 0.35 - 0.65: Door creaks open inwards
    // 0.65 - 1.00: Door wide open into black void
    let doorOpenFrac = 0;
    if (progress >= 0.35 && progress < 0.65) {
      doorOpenFrac = smootherstep((progress - 0.35) / 0.30);
    } else if (progress >= 0.65) {
      doorOpenFrac = 1.0;
    }

    // Interior black void
    ctx.fillStyle = "#020302";
    ctx.beginPath();
    ctx.rect(doorX, doorY, doorW, doorH);
    ctx.arc(doorX + doorW * 0.5, doorY, doorW * 0.5, Math.PI, 0);
    ctx.fill();

    // Door slab swinging open
    if (doorOpenFrac < 1.0) {
      const swingWidth = doorW * (1 - doorOpenFrac * 0.85);
      ctx.fillStyle = "#162018";
      ctx.fillRect(doorX, doorY, swingWidth, doorH);
    }

    // Looming Shadow emerging from doorway
    if (progress > 0.40) {
      const shadowFrac = smootherstep((progress - 0.40) / 0.40);
      ctx.save();
      ctx.fillStyle = "rgba(4, 8, 5, 0.94)";
      const shadowX = doorX + doorW * (0.25 - 0.15 * shadowFrac);
      const shadowH = charHeight * (1.15 + 0.15 * shadowFrac);
      const shadowY = groundY - shadowH;

      // Tall shadowy torso and head
      ctx.beginPath();
      ctx.ellipse(shadowX, shadowY + shadowH * 0.12, 18, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(shadowX - 25, shadowY + shadowH * 0.25);
      ctx.lineTo(shadowX + 25, shadowY + shadowH * 0.25);
      ctx.lineTo(shadowX + 35, groundY);
      ctx.lineTo(shadowX - 35, groundY);
      ctx.closePath();
      ctx.fill();

      // Long reaching claw fingers
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(4, 8, 5, 0.94)";
      ctx.beginPath();
      ctx.moveTo(shadowX - 20, shadowY + shadowH * 0.30);
      ctx.lineTo(shadowX - 60 * shadowFrac, shadowY + shadowH * (0.35 + 0.05 * shadowFrac));
      ctx.stroke();
      ctx.restore();
    }

    // Ground floor with cobblestone line
    ctx.fillStyle = "#0A0E0B";
    ctx.fillRect(0, groundY, width, height - groundY);

    // =========================================================
    // DETECTIVE (Investigator with Lantern)
    // 0.00 - 0.40: Creeping forward step
    // 0.40 - 0.70: Freezes as door opens
    // 0.70 - 1.00: Controlled recoil step back, raising lantern
    // =========================================================
    let detX = width * 0.30;
    let spineLean = 0.12; // creeping forward
    let recoil = 0;
    let walkPhase = 0;

    if (progress < 0.40) {
      const p = progress / 0.40;
      detX = width * (0.24 + 0.12 * p);
      walkPhase = p * Math.PI * 2;
      spineLean = 0.16;
    } else if (progress < 0.70) {
      detX = width * 0.36;
      spineLean = 0.12;
      walkPhase = 0;
    } else {
      recoil = smootherstep((progress - 0.70) / 0.30);
      detX = width * (0.36 - 0.08 * recoil);
      spineLean = 0.12 - 0.32 * recoil; // leaning back in shock
      walkPhase = recoil * Math.PI;
    }

    // Lantern coordinates held in front hand
    const lanternX = detX + charHeight * (0.22 - 0.06 * recoil);
    const lanternY = groundY - charHeight * (0.42 + 0.14 * recoil);

    // Warm radial lantern glow illuminating the detective and stone
    const glowGrad = ctx.createRadialGradient(
      lanternX,
      lanternY + 15,
      4,
      lanternX,
      lanternY + 15,
      120
    );
    glowGrad.addColorStop(0, "rgba(255, 225, 140, 0.35)");
    glowGrad.addColorStop(0.5, "rgba(255, 200, 100, 0.12)");
    glowGrad.addColorStop(1, "rgba(255, 180, 80, 0.0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(lanternX, lanternY + 15, 120, 0, Math.PI * 2);
    ctx.fill();

    const detPose: CharacterPose = {
      root: { x: detX, y: groundY - charHeight * 0.46 },
      characterHeight: charHeight,
      facing: 1,
      spineAngle: spineLean,
      headAngle: -spineLean * 0.5,
      // Leg walk cycle with grounded foot placement
      leftHipAngle: Math.sin(walkPhase) * 0.28,
      leftKneeAngle: Math.max(0, -Math.sin(walkPhase) * 0.45),
      leftFootAngle: 0,
      rightHipAngle: -Math.sin(walkPhase) * 0.28,
      rightKneeAngle: Math.max(0, Math.sin(walkPhase) * 0.45),
      rightFootAngle: 0,
      // Hand holding lantern
      rightHandTarget: { x: lanternX, y: lanternY },
      rightElbowBend: 1,
      leftShoulderAngle: -0.3,
      leftElbowAngle: 0.7,
      clothing: {
        type: "trenchcoat",
        coatFlare: recoil * 0.4,
        hatOnHead: true,
        lanternPos: { x: lanternX, y: lanternY },
      },
    };

    drawCharacterSilhouette(ctx, detPose);

    ctx.restore();
  },
};

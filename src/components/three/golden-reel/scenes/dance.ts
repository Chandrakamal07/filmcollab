import { GenreDefinition } from "../types";
import { CharacterPose } from "./rig/pose-types";
import { drawCharacterSilhouette } from "./rig/draw-silhouette";
import { smootherstep } from "./rig/sample-pose";

export const danceScene: GenreDefinition = {
  id: "dance",
  title: "Romance / Musical",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const groundY = height * 0.82;
    const charHeight = height * 0.65;
    const centerX = width * 0.50;

    ctx.save();

    // Warm romantic sunset / amber rose backlight
    const bgGrad = ctx.createRadialGradient(
      centerX,
      height * 0.45,
      width * 0.05,
      centerX,
      height * 0.50,
      width * 0.65
    );
    bgGrad.addColorStop(0, "#FFF5EB");
    bgGrad.addColorStop(0.40, "#FEDEC8");
    bgGrad.addColorStop(0.75, "#E8A882");
    bgGrad.addColorStop(1, "#8E4E36");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Warm wooden stage floor
    ctx.fillStyle = "#110E12";
    ctx.fillRect(0, groundY, width, height - groundY);

    // Timing breakdown:
    // 0.00 - 0.25: Approach with steps, reach out and clasp hands at shared target
    // 0.25 - 0.65: Full coordinated 360-degree spin turn with shared hands target
    // 0.65 - 1.00: Lead lunges onto planted support foot; Follower extends into ballroom dip
    let leadX = centerX - width * 0.16;
    let followX = centerX + width * 0.16;
    let leadFacing: 1 | -1 = 1;
    let followFacing: 1 | -1 = -1;
    let dipProgress = 0;
    let spinAngle = 0;

    // Shared hands clasping target in canvas coordinates
    let sharedHandsX = (leadX + followX) * 0.5;
    let sharedHandsY = groundY - charHeight * 0.48;

    if (progress < 0.25) {
      const p = smootherstep(progress / 0.25);
      leadX = centerX - width * (0.24 - 0.10 * p);
      followX = centerX + width * (0.24 - 0.10 * p);
      sharedHandsX = (leadX + followX) * 0.5;
      sharedHandsY = groundY - charHeight * (0.42 + 0.06 * p);
    } else if (progress < 0.65) {
      const p = (progress - 0.25) / 0.40;
      spinAngle = p * Math.PI * 2; // full 360 degree spin
      const orbitR = width * 0.08;
      leadX = centerX - Math.cos(spinAngle) * orbitR;
      followX = centerX + Math.cos(spinAngle) * orbitR;
      leadFacing = Math.cos(spinAngle) >= 0 ? 1 : -1;
      followFacing = Math.cos(spinAngle) >= 0 ? -1 : 1;
      sharedHandsX = centerX;
      sharedHandsY = groundY - charHeight * 0.48;
    } else {
      const p = smootherstep((progress - 0.65) / 0.35);
      dipProgress = p;
      leadX = centerX - width * 0.07;
      followX = centerX + width * (0.07 + 0.07 * p);
      leadFacing = 1;
      followFacing = -1;
      sharedHandsX = leadX + width * 0.07;
      sharedHandsY = groundY - charHeight * (0.48 - 0.12 * p);
    }

    // =========================================================
    // LEAD (Tuxedo, Male Partner)
    // =========================================================
    const leadSpine = dipProgress > 0 ? 0.28 * dipProgress : 0.05;
    const leadPose: CharacterPose = {
      root: { x: leadX, y: groundY - charHeight * (0.46 - 0.06 * dipProgress) },
      characterHeight: charHeight,
      facing: leadFacing,
      spineAngle: leadSpine,
      // Left leg (back) planted
      leftHipAngle: dipProgress > 0 ? 0.35 : -0.15,
      leftKneeAngle: dipProgress > 0 ? 0.45 : 0.20,
      leftFootAngle: 0,
      // Right leg (front) lunge
      rightHipAngle: dipProgress > 0 ? -0.45 : 0.15,
      rightKneeAngle: dipProgress > 0 ? 0.60 : 0.20,
      rightFootAngle: 0,
      // Hands locked to shared clasp target
      rightHandTarget: { x: sharedHandsX, y: sharedHandsY },
      rightElbowBend: 1,
      leftShoulderAngle: -0.4,
      leftElbowAngle: 0.8,
      clothing: { type: "tuxedo" },
    };

    // =========================================================
    // FOLLOWER (Gown, Female Partner)
    // =========================================================
    // During dip, spine arches gracefully back around hips
    const followSpine = dipProgress > 0 ? -0.75 * dipProgress : -0.05;
    const followPose: CharacterPose = {
      root: { x: followX, y: groundY - charHeight * (0.45 - 0.14 * dipProgress) },
      characterHeight: charHeight * 0.94,
      facing: followFacing,
      spineAngle: followSpine,
      headAngle: dipProgress > 0 ? -0.35 * dipProgress : 0,
      // Planted support foot
      rightHipAngle: dipProgress > 0 ? -0.20 : 0.15,
      rightKneeAngle: dipProgress > 0 ? 0.35 : 0.20,
      rightFootAngle: 0,
      // Extended leg in ballroom dip
      leftHipAngle: dipProgress > 0 ? 0.65 : -0.15,
      leftKneeAngle: dipProgress > 0 ? 0.15 : 0.20,
      leftFootAngle: dipProgress > 0 ? 0.4 : 0,
      // Hands clasp with partner
      leftHandTarget: { x: sharedHandsX, y: sharedHandsY },
      leftElbowBend: -1,
      rightShoulderAngle: dipProgress > 0 ? 0.85 : 0.2,
      rightElbowAngle: dipProgress > 0 ? 0.3 : 0.4,
      clothing: {
        type: "gown",
        dressDip: dipProgress,
        dressAngle: dipProgress * 0.3,
      },
    };

    // Z-layering: during spin, one partner passes in front of the other
    if (spinAngle > Math.PI * 0.5 && spinAngle < Math.PI * 1.5) {
      drawCharacterSilhouette(ctx, leadPose);
      drawCharacterSilhouette(ctx, followPose);
    } else {
      drawCharacterSilhouette(ctx, followPose);
      drawCharacterSilhouette(ctx, leadPose);
    }

    ctx.restore();
  },
};


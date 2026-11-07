import { GenreDefinition } from "../types";
import { CharacterPose } from "./rig/pose-types";
import { drawCharacterSilhouette } from "./rig/draw-silhouette";
import { smootherstep } from "./rig/sample-pose";

export const adventureScene: GenreDefinition = {
  id: "adventure",
  title: "Adventure / Explorer",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const groundY = height * 0.82;
    const charHeight = height * 0.52;

    ctx.save();

    // Vibrant mountain sunset / golden adventure backlight
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#FFE5B4");
    bgGrad.addColorStop(0.35, "#FCAE68");
    bgGrad.addColorStop(0.70, "#C75D38");
    bgGrad.addColorStop(1, "#541B26");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Distant mountain ranges in atmospheric silhouette
    ctx.fillStyle = "#381E2B";
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width * 0.25, height * 0.42);
    ctx.lineTo(width * 0.45, groundY - 20);
    ctx.lineTo(width * 0.75, height * 0.35);
    ctx.lineTo(width, groundY);
    ctx.closePath();
    ctx.fill();

    // Foreground Rocks & Chasm:
    // Left Cliff (takeoff) and Right Cliff (summit plateau with ledge)
    const leftCliffW = width * 0.26;
    const rightCliffX = width * 0.55;
    const ledgeY = height * 0.50; // high summit ledge

    ctx.fillStyle = "#120B10";

    // Left lower takeoff ledge
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(leftCliffW, groundY);
    ctx.lineTo(leftCliffW - 20, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Right higher summit cliff
    ctx.beginPath();
    ctx.moveTo(rightCliffX, height);
    ctx.lineTo(rightCliffX, ledgeY); // vertical cliff face
    ctx.lineTo(width, ledgeY);       // flat summit plateau
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Ledge corner point where hands lock
    const ledgePoint = { x: rightCliffX + 4, y: ledgeY };

    // Timing breakdown:
    // 0.00 - 0.25: Run and leap takeoff from left cliff
    // 0.25 - 0.50: Mid-air flight, hands reach and grab the ledgePoint
    // 0.50 - 0.75: Muscle-up pull-up, knee placed on summit
    // 0.75 - 1.00: Stand to full height on summit, raise arm in triumph

    let charX = leftCliffW * 0.5;
    let charY = groundY - charHeight * 0.46;
    let spineAngle = 0.15;
    let handTarget = { x: charX + 25, y: charY - 20 };
    let rightArmAngle = 0.2;

    if (progress < 0.25) {
      // 1. Run & Leap
      const p = progress / 0.25;
      charX = leftCliffW * (0.3 + 0.7 * p);
      const jumpArc = Math.sin(p * Math.PI) * (height * 0.12);
      charY = groundY - charHeight * 0.46 - jumpArc;
      spineAngle = 0.25;
      handTarget = { x: charX + charHeight * 0.35, y: charY - charHeight * 0.20 };
    } else if (progress < 0.50) {
      // 2. Flight to Ledge & Grab
      const p = (progress - 0.25) / 0.25;
      const smoothP = smootherstep(p);
      charX = leftCliffW + (rightCliffX - 15 - leftCliffW) * smoothP;
      charY = (groundY - charHeight * 0.46) + (ledgeY + charHeight * 0.35 - (groundY - charHeight * 0.46)) * smoothP;

      // Lock hands onto ledge during final approach
      handTarget = {
        x: ledgePoint.x - (1 - smoothP) * 30,
        y: ledgePoint.y - (1 - smoothP) * 15,
      };
      spineAngle = 0.10 * (1 - smoothP);
    } else if (progress < 0.75) {
      // 3. Pull-up and Knee Placement on Summit
      const p = (progress - 0.50) / 0.25;
      const pullP = smootherstep(p);
      // Hands remain firmly anchored to ledge
      handTarget = { x: ledgePoint.x, y: ledgePoint.y };
      // Body pulls up relative to ledge
      charX = (rightCliffX - 15) + pullP * 35;
      charY = (ledgeY + charHeight * 0.35) - pullP * (charHeight * 0.42);
      spineAngle = 0.35 * (1 - pullP);
    } else {
      // 4. Stand to Full Height & Triumphant Raise
      const p = (progress - 0.75) / 0.25;
      const standP = smootherstep(p);
      charX = rightCliffX + 20 + standP * 25;
      charY = ledgeY - charHeight * (0.15 + 0.31 * standP); // standing on summit
      spineAngle = 0.05 * (1 - standP);
      // Arm raises into triumphant pose
      rightArmAngle = 0.2 + standP * 2.2; // arm held high into the sky
      handTarget = {
        x: charX + Math.sin(rightArmAngle) * (charHeight * 0.35),
        y: charY - charHeight * 0.25 - Math.cos(rightArmAngle) * (charHeight * 0.35),
      };
    }

    const explorerPose: CharacterPose = {
      root: { x: charX, y: charY },
      characterHeight: charHeight,
      facing: 1,
      spineAngle,
      // Legs
      leftHipAngle: progress < 0.75 ? -0.4 : -0.15,
      leftKneeAngle: progress < 0.75 ? 0.8 : 0.25,
      leftFootAngle: 0,
      rightHipAngle: progress < 0.75 ? 0.3 : 0.15,
      rightKneeAngle: progress < 0.75 ? 0.6 : 0.25,
      rightFootAngle: 0,
      // Arms
      rightHandTarget: handTarget,
      rightElbowBend: 1,
      leftShoulderAngle: -0.2,
      leftElbowAngle: 0.5,
      clothing: {
        type: "explorer",
        packOnBack: true,
      },
    };

    drawCharacterSilhouette(ctx, explorerPose);

    ctx.restore();
  },
};

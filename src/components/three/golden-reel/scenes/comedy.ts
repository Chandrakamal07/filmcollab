import { GenreDefinition } from "../types";
import { CharacterPose } from "./rig/pose-types";
import { drawCharacterSilhouette } from "./rig/draw-silhouette";
import { smootherstep } from "./rig/sample-pose";

export const comedyScene: GenreDefinition = {
  id: "comedy",
  title: "Comedy / Slapstick",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const groundY = height * 0.82;
    const charHeight = height * 0.54;
    const charX = width * 0.44;

    ctx.save();

    // Warm nostalgic vintage sepia / amber stage backlight
    const bgGrad = ctx.createRadialGradient(
      width * 0.50,
      height * 0.45,
      width * 0.05,
      width * 0.50,
      height * 0.50,
      width * 0.65
    );
    bgGrad.addColorStop(0, "#FFFBEA");
    bgGrad.addColorStop(0.40, "#FDE8B3");
    bgGrad.addColorStop(0.75, "#E0B367");
    bgGrad.addColorStop(1, "#8A5E24");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Stage floor line
    ctx.fillStyle = "#120E09";
    ctx.fillRect(0, groundY, width, height - groundY);

    // Head position when standing upright
    const headY = groundY - charHeight * 0.88;

    // Timing breakdown:
    // 0.00 - 0.20: Hand reaches to hat on head, tosses it into air
    // 0.20 - 0.55: Parabolic ballistic flight of the bowler hat; performer scrambles to catch
    // 0.55 - 0.80: Catch at ankle/knee height, fumble recovery
    // 0.80 - 1.00: Theatrical grand bow, hat held proudly against chest

    let hatOnHead = false;
    let hatPos = { x: charX, y: headY };
    let hatAngle = 0;
    let spineLean = 0.05;
    let handTarget = { x: charX + 20, y: headY + 10 };
    let rootY = groundY - charHeight * 0.46;
    let caneAngle = 0.15;

    const releasePos = { x: charX + 15, y: headY - 10 };
    const catchPos = { x: charX + width * 0.12, y: groundY - charHeight * 0.25 };

    if (progress < 0.20) {
      // 1. Hat on head, hand reaching up to grab it
      const p = progress / 0.20;
      hatOnHead = p < 0.85;
      hatPos = { x: charX, y: headY };
      hatAngle = 0;
      handTarget = {
        x: charX + 10 + 10 * p,
        y: headY + 30 * (1 - p),
      };
      spineLean = 0.05;
      caneAngle = 0.15;
    } else if (progress < 0.55) {
      // 2. Parabolic ballistic flight
      const p = (progress - 0.20) / 0.35;
      // Parabolic arc: apex at p = 0.45
      const arcH = height * 0.32;
      const arcY = -4 * arcH * p * (1 - p); // standard parabola

      hatPos = {
        x: releasePos.x + (catchPos.x - releasePos.x) * p,
        y: releasePos.y + (catchPos.y - releasePos.y) * p + arcY,
      };
      hatAngle = p * Math.PI * 4; // two complete spinning flips

      // Performer stumbles forward tracking the falling hat
      const stumble = smootherstep(p);
      spineLean = 0.15 + 0.45 * stumble; // bending forward
      rootY = groundY - charHeight * (0.46 - 0.12 * stumble);
      handTarget = {
        x: hatPos.x - 10 * (1 - stumble),
        y: hatPos.y + 15 * (1 - stumble),
      };
      caneAngle = 0.15 + 0.5 * stumble;
    } else if (progress < 0.80) {
      // 3. Caught at knee height, recovering balance
      const p = (progress - 0.55) / 0.25;
      const recover = smootherstep(p);
      spineLean = 0.60 - 0.55 * recover;
      rootY = groundY - charHeight * (0.34 + 0.12 * recover);

      // Hat is now in hand, moving smoothly from catchPos to chest
      const chestPos = { x: charX + 15, y: groundY - charHeight * 0.65 };
      hatPos = {
        x: catchPos.x + (chestPos.x - catchPos.x) * recover,
        y: catchPos.y + (chestPos.y - catchPos.y) * recover,
      };
      hatAngle = (1 - recover) * 0.4;
      handTarget = { ...hatPos };
      caneAngle = 0.65 - 0.50 * recover;
    } else {
      // 4. Grand recovery bow, hat held at chest
      const p = smootherstep((progress - 0.80) / 0.20);
      spineLean = 0.05 + 0.35 * p; // bow forward from hips
      const chestPos = {
        x: charX + 15 - Math.sin(spineLean) * charHeight * 0.3,
        y: groundY - charHeight * 0.65 + (1 - Math.cos(spineLean)) * charHeight * 0.3,
      };
      hatPos = chestPos;
      hatAngle = spineLean;
      handTarget = chestPos;
      caneAngle = 0.15;
    }

    const performerPose: CharacterPose = {
      root: { x: charX, y: rootY },
      characterHeight: charHeight,
      facing: 1,
      spineAngle: spineLean,
      // Legs
      leftHipAngle: -0.15,
      leftKneeAngle: 0.25,
      leftFootAngle: 0,
      rightHipAngle: 0.15,
      rightKneeAngle: 0.25,
      rightFootAngle: 0,
      // Arms
      rightHandTarget: handTarget,
      rightElbowBend: 1,
      leftShoulderAngle: 0.3,
      leftElbowAngle: 0.4,
      clothing: {
        type: "suit",
        hatOnHead,
        hatPos: hatOnHead ? undefined : hatPos,
        hatAngle,
        caneAngle,
      },
    };

    drawCharacterSilhouette(ctx, performerPose);

    ctx.restore();
  },
};

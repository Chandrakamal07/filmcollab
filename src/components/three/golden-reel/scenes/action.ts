import { GenreDefinition } from "../types";
import { CharacterPose, PoseKey } from "./rig/pose-types";
import { samplePoseTrack } from "./rig/sample-pose";
import { drawCharacterSilhouette } from "./rig/draw-silhouette";

export const actionScene: GenreDefinition = {
  id: "action",
  title: "Action",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const groundY = height * 0.82;
    const charHeight = height * 0.65;

    ctx.save();

    // 1. Warm cinematic backlight
    const bgGrad = ctx.createRadialGradient(
      width * 0.50,
      height * 0.45,
      width * 0.05,
      width * 0.50,
      height * 0.50,
      width * 0.65
    );
    bgGrad.addColorStop(0, "#FFF7E6");
    bgGrad.addColorStop(0.45, "#FCE4B8");
    bgGrad.addColorStop(0.85, "#E2BE82");
    bgGrad.addColorStop(1, "#9E7B3E");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle atmospheric motes
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.beginPath();
    ctx.arc(width * 0.35, height * 0.32, 2.5, 0, Math.PI * 2);
    ctx.arc(width * 0.65, height * 0.28, 2.0, 0, Math.PI * 2);
    ctx.arc(width * 0.52, height * 0.40, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Ground floor
    ctx.fillStyle = "#111317";
    ctx.fillRect(0, groundY, width, height - groundY);

    // =========================================================
    // ATTACKER (Fighter A, Left)
    // Continuous trajectory:
    // 0.00: Guard stance
    // 0.20: Step forward, crouch anticipation
    // 0.45: Leaping jump, spinning high kick extension
    // 0.70: Landing impact compression
    // 1.00: Settle into poised final guard
    // =========================================================
    const attackerKeys: PoseKey<CharacterPose>[] = [
      {
        time: 0.0,
        pose: {
          root: { x: width * 0.28, y: groundY - charHeight * 0.46 },
          characterHeight: charHeight,
          facing: 1,
          spineAngle: 0.05,
          leftHipAngle: -0.25,
          leftKneeAngle: 0.35,
          rightHipAngle: 0.20,
          rightKneeAngle: 0.30,
          leftShoulderAngle: -0.5,
          leftElbowAngle: 0.8,
          rightShoulderAngle: -0.2,
          rightElbowAngle: 0.9,
          clothing: { type: "gi" },
        },
      },
      {
        time: 0.20,
        pose: {
          root: { x: width * 0.33, y: groundY - charHeight * 0.40 }, // compressed down
          characterHeight: charHeight,
          facing: 1,
          spineAngle: 0.22, // leaning forward
          leftHipAngle: -0.40,
          leftKneeAngle: 0.70,
          rightHipAngle: 0.35,
          rightKneeAngle: 0.60,
          leftShoulderAngle: -0.2,
          leftElbowAngle: 0.5,
          rightShoulderAngle: -0.6,
          rightElbowAngle: 1.1,
          clothing: { type: "gi" },
        },
      },
      {
        time: 0.45,
        pose: {
          root: { x: width * 0.44, y: groundY - charHeight * 0.64 }, // apex of jump
          characterHeight: charHeight,
          facing: 1,
          spineAngle: -0.35, // torso tilted back during high kick
          leftHipAngle: 0.20,
          leftKneeAngle: 0.85, // tucked chamber leg
          rightHipAngle: -1.35, // fully extended high kick
          rightKneeAngle: -0.05,
          rightFootAngle: -0.3,
          leftShoulderAngle: -0.8,
          leftElbowAngle: 0.4,
          rightShoulderAngle: 0.4,
          rightElbowAngle: 0.6,
          clothing: { type: "gi" },
        },
      },
      {
        time: 0.70,
        pose: {
          root: { x: width * 0.46, y: groundY - charHeight * 0.42 }, // landing compression
          characterHeight: charHeight,
          facing: 1,
          spineAngle: 0.15,
          leftHipAngle: -0.30,
          leftKneeAngle: 0.55,
          rightHipAngle: 0.40,
          rightKneeAngle: 0.50,
          leftShoulderAngle: -0.4,
          leftElbowAngle: 0.7,
          rightShoulderAngle: -0.3,
          rightElbowAngle: 0.8,
          clothing: { type: "gi" },
        },
      },
      {
        time: 1.0,
        pose: {
          root: { x: width * 0.42, y: groundY - charHeight * 0.46 }, // steady settle
          characterHeight: charHeight,
          facing: 1,
          spineAngle: 0.05,
          leftHipAngle: -0.22,
          leftKneeAngle: 0.30,
          rightHipAngle: 0.25,
          rightKneeAngle: 0.28,
          leftShoulderAngle: -0.5,
          leftElbowAngle: 0.75,
          rightShoulderAngle: -0.25,
          rightElbowAngle: 0.85,
          clothing: { type: "gi" },
        },
      },
    ];

    // =========================================================
    // DEFENDER (Fighter B, Right)
    // Continuous trajectory:
    // 0.00: Upright guard stance
    // 0.20: Weight shifts back
    // 0.45: Deep duck / slip dodge under the flying kick
    // 0.70: Rise into coiled counter-stance
    // 1.00: Poised standoff hold
    // =========================================================
    const defenderKeys: PoseKey<CharacterPose>[] = [
      {
        time: 0.0,
        pose: {
          root: { x: width * 0.74, y: groundY - charHeight * 0.46 },
          characterHeight: charHeight,
          facing: -1,
          spineAngle: 0.06,
          leftHipAngle: -0.20,
          leftKneeAngle: 0.25,
          rightHipAngle: 0.22,
          rightKneeAngle: 0.32,
          leftShoulderAngle: -0.45,
          leftElbowAngle: 0.8,
          rightShoulderAngle: -0.2,
          rightElbowAngle: 0.9,
          clothing: { type: "gi" },
        },
      },
      {
        time: 0.20,
        pose: {
          root: { x: width * 0.76, y: groundY - charHeight * 0.44 },
          characterHeight: charHeight,
          facing: -1,
          spineAngle: 0.12,
          leftHipAngle: -0.30,
          leftKneeAngle: 0.40,
          rightHipAngle: 0.28,
          rightKneeAngle: 0.42,
          leftShoulderAngle: -0.5,
          leftElbowAngle: 0.9,
          rightShoulderAngle: -0.3,
          rightElbowAngle: 1.0,
          clothing: { type: "gi" },
        },
      },
      {
        time: 0.45,
        pose: {
          root: { x: width * 0.78, y: groundY - charHeight * 0.30 }, // deep duck under kick
          characterHeight: charHeight,
          facing: -1,
          spineAngle: 0.45, // leaned forward and low
          leftHipAngle: -0.65,
          leftKneeAngle: 0.95,
          rightHipAngle: 0.55,
          rightKneeAngle: 0.85,
          leftShoulderAngle: -0.3,
          leftElbowAngle: 1.1,
          rightShoulderAngle: 0.2,
          rightElbowAngle: 1.2,
          clothing: { type: "gi" },
        },
      },
      {
        time: 0.70,
        pose: {
          root: { x: width * 0.76, y: groundY - charHeight * 0.42 }, // rising up
          characterHeight: charHeight,
          facing: -1,
          spineAngle: 0.12,
          leftHipAngle: -0.28,
          leftKneeAngle: 0.38,
          rightHipAngle: 0.26,
          rightKneeAngle: 0.36,
          leftShoulderAngle: -0.4,
          leftElbowAngle: 0.85,
          rightShoulderAngle: -0.25,
          rightElbowAngle: 0.95,
          clothing: { type: "gi" },
        },
      },
      {
        time: 1.0,
        pose: {
          root: { x: width * 0.74, y: groundY - charHeight * 0.46 }, // steady guard
          characterHeight: charHeight,
          facing: -1,
          spineAngle: 0.05,
          leftHipAngle: -0.20,
          leftKneeAngle: 0.26,
          rightHipAngle: 0.22,
          rightKneeAngle: 0.30,
          leftShoulderAngle: -0.45,
          leftElbowAngle: 0.8,
          rightShoulderAngle: -0.2,
          rightElbowAngle: 0.88,
          clothing: { type: "gi" },
        },
      },
    ];

    const currentAttacker = samplePoseTrack(attackerKeys, progress);
    const currentDefender = samplePoseTrack(defenderKeys, progress);

    drawCharacterSilhouette(ctx, currentAttacker);
    drawCharacterSilhouette(ctx, currentDefender);

    ctx.restore();
  },
};


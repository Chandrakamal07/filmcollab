import { CharacterPose, Vec2 } from "./pose-types";
import { solveTwoBone } from "./solve-two-bone";

/**
 * Draws an anatomically contoured, solid, articulated human silhouette on a 2D Canvas.
 * Produces bold, heroic cinema silhouettes with zero gaps, seams, or floating joints.
 */
export function drawCharacterSilhouette(
  ctx: CanvasRenderingContext2D,
  pose: CharacterPose,
  fillColor = "#0A0B0E"
): { leftHand: Vec2; rightHand: Vec2; leftFoot: Vec2; rightFoot: Vec2; head: Vec2 } {
  const H = pose.characterHeight;
  const facing = pose.facing; // 1 = right, -1 = left

  // Anatomical proportions based on character height H
  const headR = H * 0.082;
  const neckLen = H * 0.045;
  const spineLen = H * 0.28;
  const pelvisWidth = H * 0.18;
  const chestWidth = H * 0.24;
  const waistWidth = H * 0.16;

  const thighLen = H * 0.26;
  const calfLen = H * 0.24;
  const upperArmLen = H * 0.18;
  const forearmLen = H * 0.16;

  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = fillColor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const root = pose.root;

  // 1. Calculate Spine, Neck & Head
  const spineAngle = pose.spineAngle;
  const shoulderX = root.x - Math.sin(spineAngle) * spineLen;
  const shoulderY = root.y - Math.cos(spineAngle) * spineLen;

  const neckTopX = shoulderX - Math.sin(spineAngle) * neckLen;
  const neckTopY = shoulderY - Math.cos(spineAngle) * neckLen;

  const headAngle = spineAngle + (pose.headAngle ?? 0);
  const headCenterX = neckTopX - Math.sin(headAngle) * (headR * 1.1);
  const headCenterY = neckTopY - Math.cos(headAngle) * (headR * 1.1);

  // 2. Solve Legs
  const hipOffsetX = (pelvisWidth * 0.40) * facing;
  const leftHip: Vec2 = { x: root.x - hipOffsetX * 0.7, y: root.y + H * 0.02 };
  const rightHip: Vec2 = { x: root.x + hipOffsetX * 0.7, y: root.y + H * 0.02 };

  // Left Leg (Back leg)
  let leftKnee: Vec2;
  let leftAnkle: Vec2;
  if (pose.leftFootTarget) {
    const res = solveTwoBone(leftHip, pose.leftFootTarget, thighLen, calfLen, -1);
    leftKnee = res.joint;
    leftAnkle = res.end;
  } else {
    const hipAng = (pose.leftHipAngle ?? 0.15) * facing;
    leftKnee = {
      x: leftHip.x + Math.sin(hipAng) * thighLen,
      y: leftHip.y + Math.cos(hipAng) * thighLen,
    };
    const kneeAng = (pose.leftKneeAngle ?? hipAng) * facing;
    leftAnkle = {
      x: leftKnee.x + Math.sin(kneeAng) * calfLen,
      y: leftKnee.y + Math.cos(kneeAng) * calfLen,
    };
  }

  // Right Leg (Front leg)
  let rightKnee: Vec2;
  let rightAnkle: Vec2;
  if (pose.rightFootTarget) {
    const res = solveTwoBone(rightHip, pose.rightFootTarget, thighLen, calfLen, 1);
    rightKnee = res.joint;
    rightAnkle = res.end;
  } else {
    const hipAng = (pose.rightHipAngle ?? -0.15) * facing;
    rightKnee = {
      x: rightHip.x + Math.sin(hipAng) * thighLen,
      y: rightHip.y + Math.cos(hipAng) * thighLen,
    };
    const kneeAng = (pose.rightKneeAngle ?? hipAng) * facing;
    rightAnkle = {
      x: rightKnee.x + Math.sin(kneeAng) * calfLen,
      y: rightKnee.y + Math.cos(kneeAng) * calfLen,
    };
  }

  // 3. Solve Arms
  const shoulderOffsetX = (chestWidth * 0.46) * facing;
  const leftShoulder: Vec2 = { x: shoulderX - shoulderOffsetX * 0.6, y: shoulderY + H * 0.02 };
  const rightShoulder: Vec2 = { x: shoulderX + shoulderOffsetX * 0.6, y: shoulderY + H * 0.02 };

  // Left Arm (Back arm)
  let leftElbow: Vec2;
  let leftWrist: Vec2;
  if (pose.leftHandTarget) {
    const bend = pose.leftElbowBend ?? -1;
    const res = solveTwoBone(leftShoulder, pose.leftHandTarget, upperArmLen, forearmLen, bend);
    leftElbow = res.joint;
    leftWrist = res.end;
  } else {
    const sAng = (pose.leftShoulderAngle ?? 0.3) * facing;
    leftElbow = {
      x: leftShoulder.x + Math.sin(sAng) * upperArmLen,
      y: leftShoulder.y + Math.cos(sAng) * upperArmLen,
    };
    const eAng = sAng + (pose.leftElbowAngle ?? 0.4) * facing;
    leftWrist = {
      x: leftElbow.x + Math.sin(eAng) * forearmLen,
      y: leftElbow.y + Math.cos(eAng) * forearmLen,
    };
  }

  // Right Arm (Front arm)
  let rightElbow: Vec2;
  let rightWrist: Vec2;
  if (pose.rightHandTarget) {
    const bend = pose.rightElbowBend ?? 1;
    const res = solveTwoBone(rightShoulder, pose.rightHandTarget, upperArmLen, forearmLen, bend);
    rightElbow = res.joint;
    rightWrist = res.end;
  } else {
    const sAng = (pose.rightShoulderAngle ?? -0.3) * facing;
    rightElbow = {
      x: rightShoulder.x + Math.sin(sAng) * upperArmLen,
      y: rightShoulder.y + Math.cos(sAng) * upperArmLen,
    };
    const eAng = sAng + (pose.rightElbowAngle ?? 0.4) * facing;
    rightWrist = {
      x: rightElbow.x + Math.sin(eAng) * forearmLen,
      y: rightElbow.y + Math.cos(eAng) * forearmLen,
    };
  }

  // =========================================================
  // ROBUST SOLID DRAWING HELPERS
  // =========================================================

  // Draw solid tapered bone segment with seamless overlapping joint caps
  const drawSolidSegment = (p1: Vec2, p2: Vec2, r1: number, r2: number) => {
    // Solid circular cap at joint 1
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, r1, 0, Math.PI * 2);
    ctx.fill();

    // Solid circular cap at joint 2
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, r2, 0, Math.PI * 2);
    ctx.fill();

    // Connecting tapered trapezoid
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) return;
    const nx = -dy / len;
    const ny = dx / len;

    ctx.beginPath();
    ctx.moveTo(p1.x + nx * r1, p1.y + ny * r1);
    ctx.lineTo(p2.x + nx * r2, p2.y + ny * r2);
    ctx.lineTo(p2.x - nx * r2, p2.y - ny * r2);
    ctx.lineTo(p1.x - nx * r1, p1.y - ny * r1);
    ctx.closePath();
    ctx.fill();
  };

  const drawFoot = (ankle: Vec2, angle: number) => {
    const footLen = H * 0.11;
    const footH = H * 0.045;
    ctx.save();
    ctx.translate(ankle.x, ankle.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(footLen * 0.35 * facing, 0, footLen * 0.55, footH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawHand = (wrist: Vec2, angle: number) => {
    const handLen = H * 0.055;
    ctx.save();
    ctx.translate(wrist.x, wrist.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(handLen * 0.45 * facing, 0, handLen * 0.5, H * 0.024, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // 1. Back Arm (Left)
  drawSolidSegment(leftShoulder, leftElbow, H * 0.040, H * 0.032);
  drawSolidSegment(leftElbow, leftWrist, H * 0.032, H * 0.024);
  drawHand(leftWrist, Math.atan2(leftWrist.y - leftElbow.y, leftWrist.x - leftElbow.x));

  // 2. Back Leg (Left)
  drawSolidSegment(leftHip, leftKnee, H * 0.058, H * 0.044);
  drawSolidSegment(leftKnee, leftAnkle, H * 0.044, H * 0.030);
  drawFoot(leftAnkle, pose.leftFootAngle ?? 0);

  // 3. Pelvis & Torso (Filled anatomical mass)
  // Pelvis oval
  ctx.beginPath();
  ctx.ellipse(root.x, root.y, pelvisWidth * 0.55, H * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  // Torso shape
  const halfChest = chestWidth * 0.5;
  const halfWaist = waistWidth * 0.5;
  const waistX = root.x - Math.sin(spineAngle) * (spineLen * 0.40);
  const waistY = root.y - Math.cos(spineAngle) * (spineLen * 0.40);

  const perpX = -Math.cos(spineAngle);
  const perpY = Math.sin(spineAngle);

  ctx.beginPath();
  ctx.moveTo(root.x - perpX * halfWaist * 1.15, root.y - perpY * halfWaist * 1.15);
  ctx.lineTo(waistX - perpX * halfWaist, waistY - perpY * halfWaist);
  ctx.lineTo(shoulderX - perpX * halfChest, shoulderY - perpY * halfChest);
  ctx.lineTo(shoulderX + perpX * halfChest, shoulderY + perpY * halfChest);
  ctx.lineTo(waistX + perpX * halfWaist, waistY + perpY * halfWaist);
  ctx.lineTo(root.x + perpX * halfWaist * 1.15, root.y + perpY * halfWaist * 1.15);
  ctx.closePath();
  ctx.fill();

  // 4. Clothing Overlays
  if (pose.clothing?.type === "gown") {
    // Flowing evening ballgown
    const dip = pose.clothing.dressDip ?? 0;
    const flare = H * 0.28 + dip * H * 0.16;
    const hemY = Math.max(leftAnkle.y, rightAnkle.y) + H * 0.04;

    ctx.beginPath();
    ctx.moveTo(waistX - halfWaist, waistY);
    ctx.quadraticCurveTo(root.x - flare * 0.85, (waistY + hemY) * 0.5, root.x - flare * facing, hemY);
    ctx.lineTo(root.x + flare * 0.7 * facing, hemY);
    ctx.quadraticCurveTo(root.x + flare * 0.45, (waistY + hemY) * 0.5, waistX + halfWaist, waistY);
    ctx.closePath();
    ctx.fill();
  } else if (pose.clothing?.type === "tuxedo") {
    // Formal tuxedo coat tails
    ctx.beginPath();
    ctx.moveTo(waistX - halfWaist * 0.8, waistY);
    ctx.lineTo(root.x - H * 0.06 * facing, root.y + H * 0.26);
    ctx.lineTo(root.x + H * 0.02 * facing, root.y + H * 0.24);
    ctx.lineTo(waistX + halfWaist * 0.8, waistY);
    ctx.closePath();
    ctx.fill();
  } else if (pose.clothing?.type === "trenchcoat") {
    // Noir detective trenchcoat
    const flare = pose.clothing.coatFlare ?? 0;
    const hemY = root.y + thighLen * 0.90;
    ctx.beginPath();
    ctx.moveTo(shoulderX - halfChest * 1.1, shoulderY);
    ctx.lineTo(root.x - (halfWaist + flare * H * 0.15) * facing, hemY);
    ctx.lineTo(root.x + (halfWaist + flare * H * 0.08) * facing, hemY);
    ctx.lineTo(shoulderX + halfChest * 1.1, shoulderY);
    ctx.closePath();
    ctx.fill();
  } else if (pose.clothing?.type === "gi") {
    // Martial arts belt & flowing knot
    ctx.fillRect(waistX - halfWaist * 1.15, waistY - H * 0.02, waistWidth * 1.2, H * 0.04);
    ctx.beginPath();
    ctx.moveTo(waistX, waistY);
    ctx.lineTo(waistX + H * 0.05 * facing, waistY + H * 0.14);
    ctx.lineTo(waistX - H * 0.01 * facing, waistY + H * 0.12);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Front Leg (Right)
  drawSolidSegment(rightHip, rightKnee, H * 0.062, H * 0.048);
  drawSolidSegment(rightKnee, rightAnkle, H * 0.048, H * 0.034);
  drawFoot(rightAnkle, pose.rightFootAngle ?? 0);

  // 6. Neck & Head
  drawSolidSegment({ x: shoulderX, y: shoulderY }, { x: neckTopX, y: neckTopY }, H * 0.036, H * 0.030);

  ctx.save();
  ctx.translate(headCenterX, headCenterY);
  ctx.rotate(headAngle);

  // Cranium & facial profile
  ctx.beginPath();
  ctx.ellipse(0, 0, headR * 0.95, headR * 1.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Distinct nose & jaw profile in facing direction
  ctx.beginPath();
  ctx.moveTo(0, -headR * 0.2);
  ctx.lineTo(headR * 1.15 * facing, headR * 0.1); // nose
  ctx.lineTo(headR * 0.85 * facing, headR * 0.35); // lip
  ctx.lineTo(headR * 1.05 * facing, headR * 0.65); // chin
  ctx.lineTo(0, headR * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Headwear
  if (pose.clothing?.hatOnHead) {
    ctx.save();
    ctx.translate(headCenterX, headCenterY - headR * 0.65);
    ctx.rotate(headAngle);
    // Brim
    ctx.fillRect(-headR * 1.5, 0, headR * 3.0, H * 0.022);
    // Crown
    ctx.beginPath();
    ctx.ellipse(0, -H * 0.032, headR * 0.92, H * 0.038, 0, Math.PI, 0);
    ctx.fill();
    ctx.restore();
  } else if (pose.clothing?.hatPos) {
    ctx.save();
    ctx.translate(pose.clothing.hatPos.x, pose.clothing.hatPos.y);
    ctx.rotate(pose.clothing.hatAngle ?? 0);
    ctx.fillRect(-headR * 1.4, 0, headR * 2.8, H * 0.022);
    ctx.beginPath();
    ctx.ellipse(0, -H * 0.030, headR * 0.88, H * 0.036, 0, Math.PI, 0);
    ctx.fill();
    ctx.restore();
  }

  // 7. Front Arm (Right)
  drawSolidSegment(rightShoulder, rightElbow, H * 0.044, H * 0.036);
  drawSolidSegment(rightElbow, rightWrist, H * 0.036, H * 0.026);
  drawHand(rightWrist, Math.atan2(rightWrist.y - rightElbow.y, rightWrist.x - rightElbow.x));

  // Props (Cane, Lantern)
  if (pose.clothing?.caneAngle !== undefined) {
    ctx.save();
    ctx.translate(rightWrist.x, rightWrist.y);
    ctx.rotate(pose.clothing.caneAngle);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.05);
    ctx.lineTo(0, H * 0.38);
    ctx.arc(-H * 0.025 * facing, -H * 0.05, H * 0.025, 0, Math.PI, true);
    ctx.stroke();
    ctx.restore();
  }

  if (pose.clothing?.lanternPos) {
    ctx.save();
    ctx.translate(pose.clothing.lanternPos.x, pose.clothing.lanternPos.y);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-H * 0.03, 0, H * 0.06, H * 0.08);
    ctx.fillRect(-H * 0.035, -H * 0.015, H * 0.07, H * 0.016);
    ctx.fillRect(-H * 0.035, H * 0.08, H * 0.07, H * 0.016);
    ctx.fillStyle = "#FFE8A3";
    ctx.fillRect(-H * 0.02, H * 0.018, H * 0.04, H * 0.045);
    ctx.restore();
  }

  ctx.restore();

  return {
    leftHand: leftWrist,
    rightHand: rightWrist,
    leftFoot: leftAnkle,
    rightFoot: rightAnkle,
    head: { x: headCenterX, y: headCenterY },
  };
}

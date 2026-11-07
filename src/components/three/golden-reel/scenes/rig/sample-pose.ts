import { CharacterPose, PoseKey, Vec2 } from "./pose-types";

/**
 * Ken Perlin's smootherstep: C2 continuous with zero velocity and zero acceleration at boundaries.
 */
export function smootherstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Shortest path angular interpolation.
 */
export function interpolateAngle(from: number, to: number, blend: number): number {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + diff * blend;
}

/**
 * Unwrapped continuous angular interpolation (preserves full 360 degree spins).
 */
export function interpolateAngleUnwrapped(from: number, to: number, blend: number): number {
  return from + (to - from) * blend;
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Interpolates between two character poses.
 */
export function interpolatePose(a: CharacterPose, b: CharacterPose, factor: number): CharacterPose {
  const t = smootherstep(factor);

  const root = lerpVec2(a.root, b.root, t);
  const characterHeight = a.characterHeight + (b.characterHeight - a.characterHeight) * t;
  const facing = t < 0.5 ? a.facing : b.facing;
  const spineAngle = interpolateAngle(a.spineAngle, b.spineAngle, t);
  const headAngle = interpolateAngle(a.headAngle ?? 0, b.headAngle ?? 0, t);

  // Helper for optional angles
  const blendOptAngle = (angA?: number, angB?: number) => {
    if (angA === undefined && angB === undefined) return undefined;
    return interpolateAngle(angA ?? 0, angB ?? 0, t);
  };

  // Helper for optional vec2 targets
  const blendOptVec2 = (vA?: Vec2, vB?: Vec2) => {
    if (!vA && !vB) return undefined;
    if (vA && !vB) return { ...vA };
    if (!vA && vB) return { ...vB };
    return lerpVec2(vA!, vB!, t);
  };

  return {
    root,
    characterHeight,
    facing,
    spineAngle,
    headAngle,
    leftHipAngle: blendOptAngle(a.leftHipAngle, b.leftHipAngle),
    leftKneeAngle: blendOptAngle(a.leftKneeAngle, b.leftKneeAngle),
    leftFootAngle: blendOptAngle(a.leftFootAngle, b.leftFootAngle),
    leftFootTarget: blendOptVec2(a.leftFootTarget, b.leftFootTarget),

    rightHipAngle: blendOptAngle(a.rightHipAngle, b.rightHipAngle),
    rightKneeAngle: blendOptAngle(a.rightKneeAngle, b.rightKneeAngle),
    rightFootAngle: blendOptAngle(a.rightFootAngle, b.rightFootAngle),
    rightFootTarget: blendOptVec2(a.rightFootTarget, b.rightFootTarget),

    leftShoulderAngle: blendOptAngle(a.leftShoulderAngle, b.leftShoulderAngle),
    leftElbowAngle: blendOptAngle(a.leftElbowAngle, b.leftElbowAngle),
    leftHandAngle: blendOptAngle(a.leftHandAngle, b.leftHandAngle),
    leftHandTarget: blendOptVec2(a.leftHandTarget, b.leftHandTarget),
    leftElbowBend: t < 0.5 ? a.leftElbowBend : b.leftElbowBend,

    rightShoulderAngle: blendOptAngle(a.rightShoulderAngle, b.rightShoulderAngle),
    rightElbowAngle: blendOptAngle(a.rightElbowAngle, b.rightElbowAngle),
    rightHandAngle: blendOptAngle(a.rightHandAngle, b.rightHandAngle),
    rightHandTarget: blendOptVec2(a.rightHandTarget, b.rightHandTarget),
    rightElbowBend: t < 0.5 ? a.rightElbowBend : b.rightElbowBend,

    clothing: b.clothing
      ? {
          ...b.clothing,
          dressDip: (a.clothing?.dressDip ?? 0) * (1 - t) + (b.clothing?.dressDip ?? 0) * t,
          dressAngle: interpolateAngle(a.clothing?.dressAngle ?? 0, b.clothing?.dressAngle ?? 0, t),
          coatFlare: (a.clothing?.coatFlare ?? 0) * (1 - t) + (b.clothing?.coatFlare ?? 0) * t,
          hatPos: blendOptVec2(a.clothing?.hatPos, b.clothing?.hatPos),
          hatAngle: blendOptAngle(a.clothing?.hatAngle, b.clothing?.hatAngle),
          caneAngle: blendOptAngle(a.clothing?.caneAngle, b.clothing?.caneAngle),
          lanternPos: blendOptVec2(a.clothing?.lanternPos, b.clothing?.lanternPos),
        }
      : a.clothing,
  };
}

/**
 * Samples a continuous keyframe track of poses at any normalized progress time [0, 1].
 */
export function samplePoseTrack(keys: PoseKey<CharacterPose>[], progress: number): CharacterPose {
  if (keys.length === 0) {
    throw new Error("samplePoseTrack requires at least one keyframe");
  }
  if (keys.length === 1 || progress <= keys[0].time) {
    return keys[0].pose;
  }
  if (progress >= keys[keys.length - 1].time) {
    return keys[keys.length - 1].pose;
  }

  for (let i = 0; i < keys.length - 1; i++) {
    const kA = keys[i];
    const kB = keys[i + 1];
    if (progress >= kA.time && progress <= kB.time) {
      const span = kB.time - kA.time;
      const frac = span > 0 ? (progress - kA.time) / span : 0;
      return interpolatePose(kA.pose, kB.pose, frac);
    }
  }

  return keys[keys.length - 1].pose;
}


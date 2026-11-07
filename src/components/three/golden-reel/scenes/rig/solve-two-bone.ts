import { Vec2 } from "./pose-types";

export interface TwoBoneResult {
  joint: Vec2; // Position of elbow or knee
  end: Vec2;   // Position of hand or foot
}

/**
 * Solves a 2-bone analytical IK chain from root (shoulder/hip) to a target.
 * Preserves bone lengths rigidly without stretching or collapsing.
 *
 * @param root Shoulder or hip joint origin
 * @param target Hand or foot target
 * @param upperLength Length of upper arm or thigh
 * @param lowerLength Length of forearm or calf
 * @param bendSign Direction the mid-joint bends (+1 or -1)
 */
export function solveTwoBone(
  root: Vec2,
  target: Vec2,
  upperLength: number,
  lowerLength: number,
  bendSign: 1 | -1 = 1
): TwoBoneResult {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const rawDist = Math.hypot(dx, dy);

  // Unit direction from root to target
  let ux = 1;
  let uy = 0;
  if (rawDist > 1e-5) {
    ux = dx / rawDist;
    uy = dy / rawDist;
  }

  // Clamp distance to allowable triangle inequality range
  const minReach = Math.abs(upperLength - lowerLength) + 1e-4;
  const maxReach = upperLength + lowerLength - 1e-4;
  const dist = Math.max(minReach, Math.min(maxReach, rawDist));

  // Law of Cosines to solve mid-joint location along and perpendicular to root-target line
  const along = (upperLength * upperLength - lowerLength * lowerLength + dist * dist) / (2 * dist);
  const heightSq = Math.max(0, upperLength * upperLength - along * along);
  const height = Math.sqrt(heightSq);

  // Perpendicular vector (-uy, ux)
  const perpX = -uy;
  const perpY = ux;

  const jointX = root.x + ux * along + perpX * (bendSign * height);
  const jointY = root.y + uy * along + perpY * (bendSign * height);

  // Actual end position reached
  const endX = root.x + ux * dist;
  const endY = root.y + uy * dist;

  return {
    joint: { x: jointX, y: jointY },
    end: { x: endX, y: endY },
  };
}


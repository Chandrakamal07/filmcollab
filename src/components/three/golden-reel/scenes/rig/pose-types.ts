export interface Vec2 {
  x: number;
  y: number;
}

export interface ClothingOptions {
  type?: "gi" | "tuxedo" | "gown" | "trenchcoat" | "suit" | "explorer";
  dressDip?: number; // 0.0 to 1.0 flare during dip/spin
  dressAngle?: number;
  coatFlare?: number;
  hatOnHead?: boolean;
  hatPos?: Vec2;
  hatAngle?: number;
  caneAngle?: number;
  lanternPos?: Vec2;
  packOnBack?: boolean;
}

export interface CharacterPose {
  root: Vec2; // Center of pelvis in world/canvas space
  characterHeight: number; // Overall character reference height in pixels
  facing: 1 | -1; // 1 = facing right, -1 = facing left

  // Torso & Head
  spineAngle: number; // Angle of spine in radians (0 = upright, positive = lean forward)
  headAngle?: number; // Angle of head relative to spine

  // Left Leg (Back leg if facing right)
  leftHipAngle?: number;
  leftKneeAngle?: number;
  leftFootAngle?: number;
  leftFootTarget?: Vec2; // Optional IK target for foot

  // Right Leg (Front leg if facing right)
  rightHipAngle?: number;
  rightKneeAngle?: number;
  rightFootAngle?: number;
  rightFootTarget?: Vec2; // Optional IK target for foot

  // Left Arm
  leftShoulderAngle?: number;
  leftElbowAngle?: number;
  leftHandAngle?: number;
  leftHandTarget?: Vec2; // Optional IK target for hand
  leftElbowBend?: 1 | -1;

  // Right Arm
  rightShoulderAngle?: number;
  rightElbowAngle?: number;
  rightHandAngle?: number;
  rightHandTarget?: Vec2; // Optional IK target for hand
  rightElbowBend?: 1 | -1;

  // Clothing & Props
  clothing?: ClothingOptions;
}

export interface PoseKey<T> {
  time: number;
  pose: T;
}


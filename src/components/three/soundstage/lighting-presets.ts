export type LightingPresetId = "dramatic" | "studio" | "noir";

export interface LightingPreset {
  id: LightingPresetId;
  label: string;
  description: string;
  keyColor: string;
  keyIntensity: number;
  fillColor: string;
  fillIntensity: number;
  rimColor: string;
  rimIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  coneColor: string;
  coneOpacity: number;
  fresnelLensColor: string;
  fresnelLensEmissive: string;
}

export const LIGHTING_PRESETS: Record<LightingPresetId, LightingPreset> = {
  dramatic: {
    id: "dramatic",
    label: "Dramatic",
    description: "Warm golden amber key light with deep shadows and cinematic contrast",
    keyColor: "#ffd19a",
    keyIntensity: 100,
    fillColor: "#9aa3b5",
    fillIntensity: 1.4,
    rimColor: "#e9b457",
    rimIntensity: 60,
    ambientColor: "#20232c",
    ambientIntensity: 0.6,
    coneColor: "#ffd19a",
    coneOpacity: 0.28,
    fresnelLensColor: "#ffe5c2",
    fresnelLensEmissive: "#e9b457",
  },
  studio: {
    id: "studio",
    label: "Studio",
    description: "Balanced high-CRI neutral illumination with clean specular highlights",
    keyColor: "#fff1dd",
    keyIntensity: 150,
    fillColor: "#c5cdd9",
    fillIntensity: 2.2,
    rimColor: "#ffffff",
    rimIntensity: 45,
    ambientColor: "#2a2e3a",
    ambientIntensity: 0.85,
    coneColor: "#fff1dd",
    coneOpacity: 0.22,
    fresnelLensColor: "#ffffff",
    fresnelLensEmissive: "#fff1dd",
  },
  noir: {
    id: "noir",
    label: "Noir",
    description: "Cool silver-blue key light, high contrast, and dark graphite ambiance",
    keyColor: "#e2e9ff",
    keyIntensity: 70,
    fillColor: "#6c758a",
    fillIntensity: 0.9,
    rimColor: "#8ca6ff",
    rimIntensity: 100,
    ambientColor: "#161922",
    ambientIntensity: 0.45,
    coneColor: "#c7d6ff",
    coneOpacity: 0.26,
    fresnelLensColor: "#d6e4ff",
    fresnelLensEmissive: "#8ca6ff",
  },
};

export interface SoundstageComponent {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const SOUNDSTAGE_COMPONENTS: Record<string, SoundstageComponent> = {
  chair: {
    id: "chair",
    name: "Director's Chair",
    category: "Soundstage Focal Point",
    description: "Custom black ash scissor frame, heavy canvas seat & backrest, and solid brass hardware.",
  },
  camera: {
    id: "camera",
    name: "35mm Cinema Rig",
    category: "Production Camera",
    description: "Anamorphic prime lens, follow-focus ring, matte box, and top monitor on a hydraulic dolly.",
  },
  track: {
    id: "track",
    name: "Curved Dolly Track",
    category: "Grip & Support",
    description: "Dual precision tubular steel rails on composite sleeper ties for smooth tracking shots.",
  },
  rig: {
    id: "rig",
    name: "Overhead Truss Rig",
    category: "Studio Infrastructure",
    description: "Modular aluminum box truss suspended overhead with heavy-duty C-clamps and safety chains.",
  },
  fresnel: {
    id: "fresnel",
    name: "5KW Fresnel Spotlight",
    category: "Key Lighting",
    description: "Ribbed heat-dissipating housing, stepped optical glass lens, and adjustable 4-way barn doors.",
  },
};

export const DEFAULT_VIEWPOINT_ANGLE = 0; // 0 radians = center of bounded arc
export const MAX_ARC_ANGLE_RAD = 0.314; // ~18 degrees

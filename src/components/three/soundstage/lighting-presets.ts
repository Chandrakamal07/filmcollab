export interface LightingPreset {
  id: string;
  stationAngleDeg: number;
  label: string;
  title: string;
  description: string;
  keyColor: string;
  keyIntensity: number;
  keyPosition: [number, number, number];
  fillColor: string;
  fillIntensity: number;
  rimColor: string;
  rimIntensity: number;
  rimPosition: [number, number, number];
  ambientColor: string;
  ambientIntensity: number;
  coneColor: string;
  coneOpacity: number;
  fresnelLensColor: string;
  fresnelLensEmissive: string;
}

export const STATION_LIGHTING_LOOKS: LightingPreset[] = [
  {
    id: "station-neg60",
    stationAngleDeg: -60,
    label: "-60°",
    title: "Warm Amber Side Light",
    description: "Low-raking golden amber side light carving deep cross-shadows across the chair.",
    keyColor: "#ffaa54",
    keyIntensity: 110,
    keyPosition: [-2.2, 3.8, 1.4],
    fillColor: "#7e889a",
    fillIntensity: 1.2,
    rimColor: "#ffd694",
    rimIntensity: 55,
    rimPosition: [2.5, 3.0, -2.4],
    ambientColor: "#1a1d26",
    ambientIntensity: 0.55,
    coneColor: "#ffaa54",
    coneOpacity: 0.14,
    fresnelLensColor: "#ffd8a8",
    fresnelLensEmissive: "#ff9933",
  },
  {
    id: "station-neg30",
    stationAngleDeg: -30,
    label: "-30°",
    title: "Neutral Studio Illumination",
    description: "Balanced high-CRI clean studio illumination with crisp metallic reflections.",
    keyColor: "#fff4e6",
    keyIntensity: 145,
    keyPosition: [-0.8, 4.3, 1.8],
    fillColor: "#b2bccb",
    fillIntensity: 2.2,
    rimColor: "#ffffff",
    rimIntensity: 45,
    rimPosition: [2.2, 3.2, -2.6],
    ambientColor: "#262934",
    ambientIntensity: 0.8,
    coneColor: "#fff4e6",
    coneOpacity: 0.12,
    fresnelLensColor: "#ffffff",
    fresnelLensEmissive: "#fff4e6",
  },
  {
    id: "station-0",
    stationAngleDeg: 0,
    label: "0°",
    title: "Warm Key with Cool Rim",
    description: "Focused overhead tungsten key with a crisp cyan-blue rim kicker separating silhouettes.",
    keyColor: "#ffd19a",
    keyIntensity: 115,
    keyPosition: [0.4, 4.4, 1.2],
    fillColor: "#8e99ac",
    fillIntensity: 1.4,
    rimColor: "#8cb4ff",
    rimIntensity: 80,
    rimPosition: [2.2, 3.2, -2.8],
    ambientColor: "#1d202a",
    ambientIntensity: 0.6,
    coneColor: "#ffd19a",
    coneOpacity: 0.15,
    fresnelLensColor: "#ffe5c2",
    fresnelLensEmissive: "#e9b457",
  },
  {
    id: "station-pos30",
    stationAngleDeg: 30,
    label: "+30°",
    title: "Silver-Blue Noir",
    description: "High-contrast cool silver-blue key light with dark graphite ambient shadows.",
    keyColor: "#d8e5ff",
    keyIntensity: 95,
    keyPosition: [1.6, 4.2, 1.6],
    fillColor: "#5f687c",
    fillIntensity: 0.9,
    rimColor: "#9ec2ff",
    rimIntensity: 100,
    rimPosition: [-2.2, 3.0, -2.4],
    ambientColor: "#141720",
    ambientIntensity: 0.45,
    coneColor: "#cce0ff",
    coneOpacity: 0.13,
    fresnelLensColor: "#d6e6ff",
    fresnelLensEmissive: "#8cb4ff",
  },
  {
    id: "station-pos60",
    stationAngleDeg: 60,
    label: "+60°",
    title: "Warm Backlight & Contour",
    description: "Intense warm contour backlight sculpting the chair frame with restrained studio fill.",
    keyColor: "#ffc26e",
    keyIntensity: 105,
    keyPosition: [2.4, 3.6, -1.0],
    fillColor: "#565d70",
    fillIntensity: 0.8,
    rimColor: "#ffaa47",
    rimIntensity: 120,
    rimPosition: [-2.0, 3.4, -2.5],
    ambientColor: "#12151d",
    ambientIntensity: 0.4,
    coneColor: "#ffc26e",
    coneOpacity: 0.12,
    fresnelLensColor: "#ffc87a",
    fresnelLensEmissive: "#ff9426",
  },
];

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
    category: "Moving Production Camera",
    description: "Articulated pan-tilt fluid head tracking the chair, anamorphic prime lens, follow-focus, and matte box.",
  },
  track: {
    id: "track",
    name: "120° Curved Dolly Track",
    category: "Precision Grip & Rails",
    description: "Continuous tubular steel rails from -60° to +60° with composite sleeper ties.",
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

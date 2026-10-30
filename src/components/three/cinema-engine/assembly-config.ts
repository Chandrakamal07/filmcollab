/**
 * Cinema Engine - Component Assembly Configuration
 * Defines optical separation distances, labels, and metadata for the
 * exploded cinema camera assembly along the optical Z-axis.
 */

export interface CameraPartConfig {
  name: string;
  label: string;
  category: "CHASSIS" | "INTERFACE" | "OPTICS" | "MECHANISM" | "MECHANICS" | "HOUSING";
  distance: number; // Maximum exploded offset along local optical axis (+Z)
  description: string;
}

export const ASSEMBLY_CONFIG: CameraPartConfig[] = [
  {
    name: "CameraBody",
    label: "Camera Body",
    category: "CHASSIS",
    distance: 0.0,
    description: "Matte graphite cinema housing with Super35 sensor block, top cheese plate, and dual 15mm baseplate rod clamps.",
  },
  {
    name: "LensMount",
    label: "PL Lens Mount",
    category: "INTERFACE",
    distance: 0.34,
    description: "Positive Lock (PL) stainless steel flange with 4-tab locking collar and electronic Cooke /i metadata contacts.",
  },
  {
    name: "RearOptics",
    label: "Rear Optical Group",
    category: "OPTICS",
    distance: 0.72,
    description: "Curved optical doublet elements with multi-coating and internal matte-blackened anti-flare baffles.",
  },
  {
    name: "IrisAssembly",
    label: "Aperture Iris",
    category: "MECHANISM",
    distance: 1.12,
    description: "9-blade articulated circular aperture iris mechanism providing calibrated mechanical depth-of-field control.",
  },
  {
    name: "FocusRing",
    label: "Cinema Focus Gear",
    category: "MECHANICS",
    distance: 1.52,
    description: "0.8 MOD cinema geared focus barrel with 32-pitch cine teeth and calibrated distance witness marks.",
  },
  {
    name: "FrontOptics",
    label: "Front Optical Element",
    category: "OPTICS",
    distance: 1.96,
    description: "Large 95mm front meniscus optical glass element delivering high-transmission anamorphic/spherical rendition.",
  },
  {
    name: "FrontRing",
    label: "Front Bezel & Clamp",
    category: "HOUSING",
    distance: 2.38,
    description: "Cinema front clamp ring with matte box alignment notch and signature warm amber accent pinstripe.",
  },
];

export const DEFAULT_ASSEMBLY_VALUE = 0.35; // Settled state after entrance
export const ENTRANCE_START_VALUE = 0.8;
export const ENTRANCE_ASSEMBLED_VALUE = 0.0;
export const ENTRANCE_DURATION_SECONDS = 2.4;


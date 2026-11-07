import * as THREE from "three";
import { TRACK_CONFIG } from "./SoundstageModels";

export { TRACK_CONFIG };

export const STATIONS = [-60, -30, 0, 30, 60].map((deg) => THREE.MathUtils.degToRad(deg));

export const TRAVEL_SECONDS = 1.8;
export const LIGHT_SECONDS = 0.7;
export const HOLD_SECONDS = 0.9;

export const smootherstep = (value: number): number => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export interface TrackSequenceState {
  angle: number;
  station: number;
  destination: number;
  phase: "travel" | "dwell";
  lightFrom: number;
  lightTo: number;
  lightMix: number;
  isReversing: boolean;
  distanceDelta: number;
}

export function createTrackSequence(initialStationIndex = 0) {
  let station = Math.max(0, Math.min(initialStationIndex, STATIONS.length - 1));
  let destination = station === STATIONS.length - 1 ? station - 1 : station + 1;
  let direction = 1; // 1 = forward (-60 to +60), -1 = backward (+60 to -60)
  let phase: "travel" | "dwell" = "dwell";
  let elapsed = 0;

  let angle = STATIONS[station];
  let previousAngle = angle;
  let lightFrom = station;
  let lightTo = station;

  return {
    getStationIndex() {
      return station;
    },
    getAngle() {
      return angle;
    },
    goToStation(targetIndex: number) {
      const clamped = Math.max(0, Math.min(targetIndex, STATIONS.length - 1));
      if (clamped === station && phase === "dwell") {
        return;
      }
      destination = clamped;
      direction = destination >= station ? 1 : -1;
      phase = "travel";
      elapsed = 0;
      lightFrom = station;
      lightTo = destination;
    },
    reset() {
      station = 0;
      destination = 1;
      direction = 1;
      phase = "dwell";
      elapsed = 0;
      angle = STATIONS[station];
      previousAngle = angle;
      lightFrom = station;
      lightTo = station;
    },
    jumpToStation(targetIndex: number) {
      const clamped = Math.max(0, Math.min(targetIndex, STATIONS.length - 1));
      station = clamped;
      destination = station === STATIONS.length - 1 ? station - 1 : station + 1;
      direction = station === STATIONS.length - 1 ? -1 : 1;
      phase = "dwell";
      elapsed = LIGHT_SECONDS + HOLD_SECONDS;
      angle = STATIONS[station];
      previousAngle = angle;
      lightFrom = station;
      lightTo = station;
    },
    update(deltaSeconds: number, running: boolean): TrackSequenceState {
      const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);

      if (running) {
        elapsed += dt;
      }

      previousAngle = angle;

      if (phase === "travel") {
        const progress = Math.min(elapsed / TRAVEL_SECONDS, 1);
        const eased = smootherstep(progress);

        angle = THREE.MathUtils.lerp(STATIONS[station], STATIONS[destination], eased);

        // Keep outgoing lighting unchanged during travel
        lightFrom = station;
        lightTo = station;

        if (progress >= 1) {
          angle = STATIONS[destination];
          const previousStation = station;
          station = destination;
          phase = "dwell";
          elapsed = 0;

          // Begin the next lighting transition only after the dolly stops
          lightFrom = previousStation;
          lightTo = station;
        }
      } else if (phase === "dwell") {
        angle = STATIONS[station];

        if (running && elapsed >= LIGHT_SECONDS + HOLD_SECONDS) {
          // Reverse direction at endpoints (-60° and +60°)
          if (station >= STATIONS.length - 1) {
            direction = -1;
          } else if (station <= 0) {
            direction = 1;
          }

          destination = station + direction;
          phase = "travel";
          elapsed = 0;
          lightFrom = station;
          lightTo = station;
        }
      }

      // Lighting transition occurs during the first LIGHT_SECONDS of dwell
      const lightMix = phase === "dwell"
        ? (LIGHT_SECONDS > 0 ? smootherstep(Math.min(elapsed / LIGHT_SECONDS, 1)) : 1)
        : 1;

      const distanceDelta = TRACK_CONFIG.centerlineRadius * (angle - previousAngle);

      return {
        angle,
        station,
        destination,
        phase,
        lightFrom,
        lightTo,
        lightMix,
        isReversing: direction < 0,
        distanceDelta,
      };
    },
  };
}

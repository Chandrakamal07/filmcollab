import type { Transition, Variants } from "motion/react";

export const STUDIO_NOIR_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const NOIR_TRANSITIONS = {
  control: {
    duration: 0.15,
    ease: STUDIO_NOIR_EASE,
  } satisfies Transition,
  card: {
    duration: 0.22,
    ease: STUDIO_NOIR_EASE,
  } satisfies Transition,
  panel: {
    duration: 0.22,
    ease: STUDIO_NOIR_EASE,
  } satisfies Transition,
  section: {
    duration: 0.28,
    ease: STUDIO_NOIR_EASE,
  } satisfies Transition,
  marketing: {
    duration: 0.42,
    ease: STUDIO_NOIR_EASE,
  } satisfies Transition,
};

export function getStaggerDelay(index: number, stepSeconds = 0.032, maxSeconds = 0.24): number {
  return Math.min(Math.max(0, index) * stepSeconds, maxSeconds);
}

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: NOIR_TRANSITIONS.section,
  },
};

export const marketingRevealVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: NOIR_TRANSITIONS.marketing,
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: NOIR_TRANSITIONS.card,
  },
};


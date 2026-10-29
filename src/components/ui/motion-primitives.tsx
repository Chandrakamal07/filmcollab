import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { STUDIO_NOIR_EASE, getStaggerDelay } from "@/lib/motion";

export interface FadeInSectionProps extends HTMLMotionProps<"div"> {
  delay?: number;
  variant?: "workspace" | "marketing";
  once?: boolean;
}

export const FadeInSection = React.forwardRef<HTMLDivElement, FadeInSectionProps>(
  ({ className, children, delay = 0, variant = "workspace", once = true, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    if (prefersReducedMotion) {
      return (
        <motion.div ref={ref} className={className} {...props}>
          {children}
        </motion.div>
      );
    }

    const duration = variant === "marketing" ? 0.42 : 0.28;
    const yOffset = variant === "marketing" ? 16 : 10;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: yOffset }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once, margin: "-40px" }}
        transition={{ duration, delay, ease: STUDIO_NOIR_EASE }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
FadeInSection.displayName = "FadeInSection";

export interface StaggerItemProps extends HTMLMotionProps<"div"> {
  index?: number;
  step?: number;
  maxDelay?: number;
  liftOnHover?: boolean;
}

export const StaggerItem = React.forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ className, children, index = 0, step = 0.032, maxDelay = 0.24, liftOnHover = false, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const delay = getStaggerDelay(index, step, maxDelay);

    if (prefersReducedMotion) {
      return (
        <motion.div ref={ref} className={className} {...props}>
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay, ease: STUDIO_NOIR_EASE }}
        whileHover={liftOnHover ? { y: -3, transition: { duration: 0.18, ease: STUDIO_NOIR_EASE } } : undefined}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
StaggerItem.displayName = "StaggerItem";

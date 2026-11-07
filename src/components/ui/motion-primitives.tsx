import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from "motion/react";
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

    const duration = variant === "marketing" ? 0.44 : 0.3;
    const yOffset = variant === "marketing" ? 18 : 12;

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

export interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  staggerDelay?: number;
}

export const StaggerContainer = React.forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div ref={ref} className={className} {...props}>
        {children}
      </motion.div>
    );
  }
);
StaggerContainer.displayName = "StaggerContainer";

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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay, ease: STUDIO_NOIR_EASE }}
        whileHover={liftOnHover ? { y: -4, transition: { duration: 0.2, ease: STUDIO_NOIR_EASE } } : undefined}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
StaggerItem.displayName = "StaggerItem";

export interface DimensionalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  maxTilt?: number;
  tiltStrength?: number;
  glareOpacity?: number;
  interactive?: boolean;
}

/**
 * 3D Perspective Dimensional Card with spring-driven pointer tilt,
 * dynamic radial amber/specular highlight glare, and separated Z-depth layers.
 */
export const DimensionalCard = React.forwardRef<HTMLDivElement, DimensionalCardProps>(
  ({ className, children, maxTilt, tiltStrength, glareOpacity = 0.16, interactive = true, onMouseMove, onMouseLeave, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const effectiveTilt = maxTilt ?? tiltStrength ?? 6.5;
    const pointerX = useMotionValue(0.5);
    const pointerY = useMotionValue(0.5);
    const isHovered = useMotionValue(0);

    const springConfig = { stiffness: 260, damping: 24, mass: 0.6 };
    const smoothX = useSpring(pointerX, springConfig);
    const smoothY = useSpring(pointerY, springConfig);
    const smoothHover = useSpring(isHovered, { stiffness: 220, damping: 26 });

    const rotateX = useTransform(smoothY, [0, 1], [effectiveTilt, -effectiveTilt]);
    const rotateY = useTransform(smoothX, [0, 1], [-effectiveTilt, effectiveTilt]);
    const scale = useTransform(smoothHover, [0, 1], [1, 1.015]);
    const glareX = useTransform(smoothX, [0, 1], ["0%", "100%"]);
    const glareY = useTransform(smoothY, [0, 1], ["0%", "100%"]);

    const glareBackground = useMotionTemplate`radial-gradient(360px circle at ${glareX} ${glareY}, rgba(233, 180, 87, ${glareOpacity}), rgba(255, 255, 255, 0.04) 45%, transparent 75%)`;

    const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
      onMouseMove?.(e);
      if (prefersReducedMotion || !interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      pointerX.set(nx);
      pointerY.set(ny);
      isHovered.set(1);
    };

    const handlePointerLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      onMouseLeave?.(e);
      pointerX.set(0.5);
      pointerY.set(0.5);
      isHovered.set(0);
    };

    if (prefersReducedMotion || !interactive) {
      return (
        <div
          ref={ref}
          data-dimensional-card="static"
          className={cn(
            "relative rounded-xl border border-border/80 bg-card text-card-foreground shadow-noir transition-colors duration-200 hover:border-primary/40",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <div className="relative" style={{ perspective: "1100px" }}>
        <motion.div
          ref={ref}
          data-dimensional-card="3d"
          onMouseMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
          style={{
            rotateX,
            rotateY,
            scale,
            transformStyle: "preserve-3d",
          }}
          className={cn(
            "group/dim relative rounded-xl border border-border/80 bg-card text-card-foreground shadow-noir transition-[border-color,box-shadow] duration-200 hover:border-primary/45 hover:shadow-noir-lg",
            className,
          )}
          {...(props as unknown as HTMLMotionProps<"div">)}
        >
          <motion.div
            aria-hidden="true"
            style={{
              background: glareBackground,
              opacity: smoothHover,
            }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] z-20 transition-opacity duration-200"
          />
          {children}
        </motion.div>
      </div>
    );
  },
);
DimensionalCard.displayName = "DimensionalCard";

export interface DimensionalLayerProps extends React.HTMLAttributes<HTMLDivElement> {
  depth?: number;
}

export const DimensionalLayer = React.forwardRef<HTMLDivElement, DimensionalLayerProps>(
  ({ className, depth = 18, style, children, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        transform: `translateZ(${depth}px)`,
        transformStyle: "preserve-3d",
        ...style,
      }}
      className={cn("relative", className)}
      {...props}
    >
      {children}
    </div>
  ),
);
DimensionalLayer.displayName = "DimensionalLayer";

export interface ImageRevealProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  containerClassName?: string;
  overlayClassName?: string;
}

export const ImageReveal: React.FC<ImageRevealProps> = ({
  wrapperClassName,
  containerClassName,
  overlayClassName,
  className,
  alt = "",
  ...imgProps
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [loaded, setLoaded] = React.useState(false);
  const effectiveWrapperClass = wrapperClassName || containerClassName;

  return (
    <div className={cn("relative overflow-hidden bg-surface-elevated", effectiveWrapperClass)}>
      <motion.img
        alt={alt}
        onLoad={() => setLoaded(true)}
        initial={prefersReducedMotion ? false : { scale: 1.07, opacity: 0, filter: "blur(6px)" }}
        animate={
          prefersReducedMotion
            ? { scale: 1, opacity: 1 }
            : {
                scale: loaded ? 1 : 1.04,
                opacity: 1,
                filter: "blur(0px)",
              }
        }
        transition={{ duration: 0.52, ease: STUDIO_NOIR_EASE }}
        className={cn("w-full h-full object-cover", className)}
        {...(imgProps as unknown as HTMLMotionProps<"img">)}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent",
          overlayClassName,
        )}
      />
    </div>
  );
};

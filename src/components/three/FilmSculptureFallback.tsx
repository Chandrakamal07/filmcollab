import * as React from "react";
import { cn } from "@/lib/utils";

interface FilmSculptureFallbackProps {
  className?: string;
  isFadingOut?: boolean;
}

/**
 * Consolidated Cinematic Frame Flow Fallback.
 * Matches the photographic 3-frame diagonal composition using HTML/CSS.
 * Used for initial pre-load, WebGL unsupported/failure, mobile view, and prefers-reduced-motion.
 */
export const FilmSculptureFallback: React.FC<FilmSculptureFallbackProps> = ({
  className,
  isFadingOut = false,
}) => {
  return (
    <div
      data-testid="film-sculpture-fallback"
      aria-label="Cinematic production frames composition"
      className={cn(
        "relative w-full h-full min-h-[280px] sm:min-h-[340px] flex items-center justify-center select-none pointer-events-none overflow-hidden transition-opacity duration-300 ease-out",
        isFadingOut ? "opacity-0" : "opacity-100",
        className,
      )}
      style={{ perspective: "1000px" }}
    >
      {/* Ambient warm rim glow matching Three.js key/rim lights */}
      <div className="absolute top-[12%] right-[14%] w-64 h-48 rounded-full bg-primary/15 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[16%] left-[18%] w-52 h-40 rounded-full bg-primary/10 blur-[70px] pointer-events-none" />

      {/* Composition Container with subtle 3D perspective orientation */}
      <div
        className="relative w-full max-w-[500px] h-[300px] sm:h-[350px] flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Frame 3: Supporting Frame 2 (Lower-Left Depth Layer) */}
        <div
          className="absolute rounded-xl border border-white/10 bg-[#16181D] shadow-[0_12px_32px_rgba(0,0,0,0.65)] overflow-hidden transition-transform duration-700 ease-out"
          style={{
            width: "46%",
            aspectRatio: "16 / 9.5",
            left: "6%",
            bottom: "12%",
            transform: "translateZ(-70px) rotateY(-4deg) rotateX(2deg)",
            filter: "brightness(0.78) contrast(1.05)",
          }}
        >
          <div className="relative w-full h-full overflow-hidden">
            <img
              src="/images/hero/frame-supporting-2.jpg"
              alt="Anamorphic cinema camera optics"
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 border border-primary/25 rounded-xl pointer-events-none" />
            <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground/90 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              03 // OPTICS
            </div>
          </div>
        </div>

        {/* Frame 2: Supporting Frame 1 (Upper-Right Depth Layer) */}
        <div
          className="absolute rounded-xl border border-white/10 bg-[#16181D] shadow-[0_14px_38px_rgba(0,0,0,0.7)] overflow-hidden transition-transform duration-700 ease-out"
          style={{
            width: "54%",
            aspectRatio: "16 / 9.5",
            right: "6%",
            top: "8%",
            transform: "translateZ(-35px) rotateY(-12deg) rotateX(4deg)",
            filter: "brightness(0.85) contrast(1.05)",
          }}
        >
          <div className="relative w-full h-full overflow-hidden">
            <img
              src="/images/hero/frame-main.jpg"
              alt="Camera operator on tracking shot on set"
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <div className="absolute inset-0 border border-primary/30 rounded-xl pointer-events-none" />
            <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground/90 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/80" />
              02 // CAMERA UNIT
            </div>
          </div>
        </div>

        {/* Frame 1: Hero Frame (Foreground Focal Point) */}
        <div
          className="absolute rounded-xl border border-white/15 bg-[#181A1F] shadow-[0_20px_54px_rgba(0,0,0,0.85),0_0_0_1px_rgba(233,180,87,0.22)] overflow-hidden transition-transform duration-700 ease-out z-10"
          style={{
            width: "70%",
            aspectRatio: "16 / 9.5",
            left: "15%",
            top: "22%",
            transform: "translateZ(30px) rotateY(-6deg) rotateX(2deg)",
          }}
        >
          <div className="relative w-full h-full overflow-hidden">
            <img
              src="/images/hero/frame-supporting-1.jpg"
              alt="Film production slate on set"
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
            {/* Thin warm amber precision rim highlight */}
            <div className="absolute inset-0 border border-primary/50 rounded-xl shadow-[inset_0_0_16px_rgba(233,180,87,0.18)] pointer-events-none" />

            {/* Frame metadata footer */}
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between font-mono text-[10px] text-foreground/90 tracking-wider">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#E9B457]" />
                <span className="font-semibold text-primary uppercase">01 // PRODUCTION</span>
              </div>
              <span className="text-muted-foreground text-[9px]">35MM WIDESCREEN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilmSculptureFallback;

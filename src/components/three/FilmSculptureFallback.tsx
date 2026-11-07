import * as React from "react";
import { cn } from "@/lib/utils";

interface FilmSculptureFallbackProps {
  className?: string;
  isFadingOut?: boolean;
}

/**
 * Consolidated 3D Cinema Ribbon Fallback.
 * Depicts ONE continuous, curved 35mm cinema ribbon bending smoothly
 * into an open S-shaped curve and receding into depth with authentic sprockets
 * and amber studio lighting accents.
 * Used for initial pre-load, WebGL unsupported/failure, and prefers-reduced-motion.
 */
export const FilmSculptureFallback: React.FC<FilmSculptureFallbackProps> = ({
  className,
  isFadingOut = false,
}) => {
  return (
    <div
      data-testid="film-ribbon-fallback"
      aria-label="Continuous 3D cinema ribbon composition"
      className={cn(
        "relative w-full h-full min-h-[320px] sm:min-h-[400px] flex items-center justify-center select-none pointer-events-none overflow-hidden transition-opacity duration-300 ease-out",
        isFadingOut ? "opacity-0" : "opacity-100",
        className,
      )}
      style={{ perspective: "1400px" }}
    >
      {/* Soft warm studio rim lighting */}
      <div className="absolute top-[16%] right-[18%] w-80 h-64 rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[22%] left-[15%] w-64 h-52 rounded-full bg-primary/10 blur-[85px] pointer-events-none" />

      {/* 3D S-Curved Ribbon Assembly */}
      <div
        className="relative w-full max-w-[620px] h-[360px] sm:h-[420px] flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Rear Deep Receding Loop of the S (Layer 3) */}
        <div
          className="absolute rounded-xl border-t border-b border-primary/30 bg-[#121418] shadow-[0_16px_40px_rgba(0,0,0,0.85)] overflow-hidden"
          style={{
            width: "42%",
            height: "140px",
            right: "12%",
            top: "8%",
            transform: "translateZ(-140px) rotateY(-24deg) rotateX(12deg) rotateZ(-6deg)",
            filter: "brightness(0.72) contrast(1.1)",
          }}
        >
          {/* Top/Bottom 35mm Sprocket Rails */}
          <div className="absolute inset-x-0 top-0 h-4 bg-[#0E1013] border-b border-primary/25 flex items-center justify-around px-2 z-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="w-2 h-2 rounded-[2px] bg-primary/30" />
            ))}
          </div>
          <div className="absolute inset-0 pt-4 pb-4">
            <img
              src="/images/hero/frame-4.jpg"
              alt="Cinema soundstage studio"
              className="w-full h-full object-cover object-center opacity-85"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/70" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-4 bg-[#0E1013] border-t border-primary/25 flex items-center justify-around px-2 z-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="w-2 h-2 rounded-[2px] bg-primary/30" />
            ))}
          </div>
        </div>

        {/* Mid Turn of the S-Curve (Layer 2) */}
        <div
          className="absolute rounded-xl border-t border-b border-primary/45 bg-[#14161B] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
          style={{
            width: "56%",
            height: "170px",
            right: "2%",
            top: "24%",
            transform: "translateZ(-60px) rotateY(-18deg) rotateX(8deg) rotateZ(-3deg)",
            filter: "brightness(0.85) contrast(1.05)",
          }}
        >
          <div className="absolute inset-x-0 top-0 h-5 bg-[#0F1115] border-b border-primary/35 flex items-center justify-around px-2 z-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="w-2 h-2.5 rounded-[2px] bg-primary/40" />
            ))}
          </div>
          <div className="absolute inset-0 pt-5 pb-5">
            <img
              src="/images/hero/frame-supporting-1.jpg"
              alt="Cinematography stage lighting"
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
            <div className="absolute bottom-6 left-3 font-mono text-[9px] text-primary/90 uppercase tracking-widest">
              02 // STAGE LIGHTING
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-5 bg-[#0F1115] border-t border-primary/35 flex items-center justify-around px-2 z-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="w-2 h-2.5 rounded-[2px] bg-primary/40" />
            ))}
          </div>
        </div>

        {/* Broad Photographic Foreground Section of the S-Ribbon (Layer 1) */}
        <div
          className="absolute rounded-xl border-t border-b border-primary/60 bg-[#16181D] shadow-[0_28px_70px_rgba(0,0,0,0.92),0_0_0_1px_rgba(233,180,87,0.35)] overflow-hidden z-20"
          style={{
            width: "75%",
            height: "215px",
            left: "8%",
            top: "32%",
            transform: "translateZ(40px) rotateY(-6deg) rotateX(2deg) rotateZ(1deg)",
          }}
        >
          {/* Top 35mm Perforation Rail with Amber Trim */}
          <div className="absolute inset-x-0 top-0 h-6 bg-[#111317] border-b border-primary/45 flex items-center justify-between px-3 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-1.5 rounded-[1px] bg-primary/80" />
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary font-semibold">
                35MM CONTINUOUS CINEMA RIBBON
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="w-2.5 h-3 rounded-[2px] bg-primary/50 shadow-[0_0_4px_rgba(233,180,87,0.3)]" />
              ))}
            </div>
          </div>

          {/* Broad Photographic Surface */}
          <div className="absolute inset-0 pt-6 pb-6">
            <img
              src="/images/hero/frame-main.jpg"
              alt="Film director and camera operator on set"
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
            <div className="absolute inset-0 shadow-[inset_0_0_24px_rgba(0,0,0,0.7)]" />

            {/* Frame metadata footer */}
            <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between font-mono text-[10px] text-foreground/90 tracking-wider">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#E9B457]" />
                <span className="font-semibold text-primary uppercase">01 // PRODUCTION</span>
              </div>
              <span className="text-muted-foreground text-[9px]">ANAMORPHIC S-CURVE</span>
            </div>
          </div>

          {/* Bottom 35mm Perforation Rail with Amber Trim */}
          <div className="absolute inset-x-0 bottom-0 h-6 bg-[#111317] border-t border-primary/45 flex items-center justify-between px-3 z-10">
            <span className="font-mono text-[9px] text-muted-foreground">SCENE 14A // TAKE 4</span>
            <div className="flex items-center gap-2.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="w-2.5 h-3 rounded-[2px] bg-primary/50 shadow-[0_0_4px_rgba(233,180,87,0.3)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilmSculptureFallback;

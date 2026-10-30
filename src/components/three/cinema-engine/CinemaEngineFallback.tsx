import * as React from "react";
import { cn } from "@/lib/utils";

interface CinemaEngineFallbackProps {
  className?: string;
  isFadingOut?: boolean;
}

/**
 * Cinema Engine Fallback - Depicts the 3D cinema camera and optical assembly
 * in a semi-exploded diagonal presentation with matte graphite housing,
 * titanium PL mount, aperture iris, and warm amber studio rim lighting.
 */
export const CinemaEngineFallback: React.FC<CinemaEngineFallbackProps> = ({
  className,
  isFadingOut = false,
}) => {
  return (
    <div
      data-testid="cinema-engine-fallback"
      aria-label="Cinema Engine 3D Camera Assembly Preview"
      className={cn(
        "relative w-full h-full min-h-[320px] sm:min-h-[420px] flex items-center justify-center select-none pointer-events-none overflow-hidden transition-opacity duration-300 ease-out",
        isFadingOut ? "opacity-0" : "opacity-100",
        className,
      )}
      style={{ perspective: "1200px" }}
    >
      {/* Studio Lighting Highlights */}
      <div className="absolute top-[18%] right-[16%] w-72 h-56 rounded-full bg-primary/20 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-[24%] left-[20%] w-60 h-48 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />

      {/* Exploded Camera Assembly Composition */}
      <div
        className="relative w-full max-w-[560px] h-[340px] sm:h-[400px] flex items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(-24deg) rotateX(8deg) rotateZ(-3deg)",
        }}
      >
        {/* Layer 1: Camera Body Chassis (Rear-Left) */}
        <div
          className="absolute rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1D24] via-[#14161B] to-[#0E1013] shadow-[0_24px_50px_rgba(0,0,0,0.9)] overflow-hidden"
          style={{
            width: "48%",
            height: "220px",
            left: "6%",
            top: "22%",
            transform: "translateZ(-80px)",
          }}
        >
          {/* Top Cheese Plate Profile */}
          <div className="absolute inset-x-0 top-0 h-4 bg-[#101216] border-b border-white/10 flex items-center justify-around px-3">
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <span className="w-2 h-2 rounded-full border border-primary/40 bg-black/60" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>

          {/* Side Operator Status Screen */}
          <div className="absolute left-3 top-8 w-24 h-16 rounded-md bg-[#080A0D] border border-white/[0.08] p-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[7px] font-mono text-primary/90">
              <span>24.00 FPS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 animate-pulse" />
            </div>
            <div className="text-[8px] font-mono text-[#D4D8E0] font-semibold">
              4K 2.39:1
            </div>
            <div className="text-[7px] font-mono text-white/50">
              ISO 800 • 5600K
            </div>
          </div>

          {/* Cooling Louvers */}
          <div className="absolute right-3 top-10 flex flex-col gap-1">
            <div className="w-12 h-1 bg-black/60 rounded-full border-b border-white/10" />
            <div className="w-12 h-1 bg-black/60 rounded-full border-b border-white/10" />
            <div className="w-12 h-1 bg-black/60 rounded-full border-b border-white/10" />
          </div>

          {/* Front Sensor Cavity Accent */}
          <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 border-primary/40 bg-[#0E1F1A] shadow-[inset_0_0_12px_rgba(233,180,87,0.3)] flex items-center justify-center">
            <div className="w-8 h-5 rounded-[2px] bg-[#122A22] border border-primary/30" />
          </div>
        </div>

        {/* Layer 2: PL Lens Mount (Separated along axis) */}
        <div
          className="absolute rounded-full border-2 border-primary/50 bg-[#1A1D24] shadow-[0_16px_36px_rgba(0,0,0,0.85)] flex items-center justify-center"
          style={{
            width: "90px",
            height: "90px",
            left: "44%",
            top: "38%",
            transform: "translateZ(-20px)",
          }}
        >
          <div className="w-16 h-16 rounded-full border border-white/20 bg-[#101216] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border border-primary/40 bg-black/80" />
          </div>
          {/* Gold Contacts */}
          <div className="absolute top-1.5 flex gap-1">
            <span className="w-1 h-1 rounded-full bg-primary" />
            <span className="w-1 h-1 rounded-full bg-primary" />
            <span className="w-1 h-1 rounded-full bg-primary" />
          </div>
        </div>

        {/* Layer 3: Articulated Aperture Iris Mechanism */}
        <div
          className="absolute rounded-full border-2 border-white/20 bg-[#121418] shadow-[0_20px_40px_rgba(0,0,0,0.9)] flex items-center justify-center"
          style={{
            width: "110px",
            height: "110px",
            left: "56%",
            top: "35%",
            transform: "translateZ(30px)",
          }}
        >
          <div className="w-20 h-20 rounded-full border border-primary/30 bg-[#090A0D] flex items-center justify-center relative overflow-hidden">
            {/* 9 Radial Iris Blade Indications */}
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="absolute w-7 h-2.5 bg-[#252830] border-t border-white/20 rounded-[2px]"
                style={{
                  transform: `rotate(${i * 40}deg) translate(14px, 4px)`,
                  opacity: 0.9,
                }}
              />
            ))}
            <div className="w-7 h-7 rounded-full bg-black/95 z-10 border border-primary/50" />
          </div>
        </div>

        {/* Layer 4: Front Optics & Cooke Gold Ring (Front-Right Foreground) */}
        <div
          className="absolute rounded-full border-2 border-primary/80 bg-gradient-to-br from-[#20242C] via-[#121418] to-black shadow-[0_28px_60px_rgba(0,0,0,0.95),0_0_24px_rgba(233,180,87,0.25)] flex items-center justify-center"
          style={{
            width: "140px",
            height: "140px",
            left: "68%",
            top: "31%",
            transform: "translateZ(90px)",
          }}
        >
          {/* Large Curved Glass Reflection */}
          <div className="w-28 h-28 rounded-full border border-white/30 bg-gradient-to-tr from-[#0F1B22]/80 via-[#2A3F4C]/40 to-[#E9B457]/20 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(233,180,87,0.3),transparent_70%)]" />
            <div className="absolute inset-x-2 top-2 h-7 rounded-full bg-white/10 blur-[2px]" />
          </div>
          {/* Amber Accent Ring */}
          <div className="absolute inset-0 rounded-full border border-primary/70 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default CinemaEngineFallback;


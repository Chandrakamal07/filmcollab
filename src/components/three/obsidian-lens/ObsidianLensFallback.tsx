import * as React from "react";
import { Aperture, Compass } from "lucide-react";

export const ObsidianLensFallback: React.FC = () => {
  return (
    <div
      data-testid="obsidian-lens-fallback"
      className="relative w-full h-full min-h-[360px] sm:min-h-[440px] lg:min-h-[480px] rounded-2xl bg-gradient-to-b from-[#0D0E12] via-[#090A0D] to-[#060709] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center select-none"
    >
      {/* Studio Lighting Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(233,180,87,0.08)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(140,180,255,0.05)_0%,transparent_50%)] pointer-events-none" />

      {/* Obsidian Cinema Lens Schematic SVG */}
      <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-sm">
        <div className="relative w-44 h-44 mb-6 flex items-center justify-center">
          {/* Outer 114mm Matte Box Ring */}
          <div className="absolute inset-0 rounded-full border border-white/[0.12] bg-[#12141A]/60 shadow-[0_0_30px_rgba(0,0,0,0.8)]" />

          {/* 95mm Thread Collar */}
          <div className="absolute inset-3 rounded-full border border-primary/25 border-dashed animate-[spin_60s_linear_infinite]" />

          {/* Optical Element Curvature Shimmer */}
          <div className="absolute inset-6 rounded-full border border-white/[0.08] bg-gradient-to-tr from-transparent via-white/[0.04] to-primary/10" />

          {/* Iris Blades Center */}
          <div className="relative w-20 h-20 rounded-full border border-primary/40 bg-[#0A0C10] flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]">
            <Aperture className="w-10 h-10 text-primary/80 animate-pulse" />
          </div>

          {/* Amber Witness Mark */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(233,180,87,0.6)]" />
        </div>

        {/* Cinematic Typography Readout */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono uppercase tracking-[0.22em] text-primary mb-2">
          <Compass className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: "12s" }} />
          <span>Obsidian Cinema Prime</span>
        </div>
        <h3 className="font-display text-lg text-foreground/90 font-medium tracking-tight mb-1">
          50mm T1.5 Full-Frame 8K
        </h3>
        <p className="text-xs text-[#8C929E] font-mono leading-relaxed max-w-[260px]">
          Initializing multi-coated optics & 11-blade mechanical iris...
        </p>
      </div>

      {/* Corner Studio Grid Markers */}
      <div className="absolute top-4 left-4 text-[9px] font-mono text-white/20 tracking-wider">
        [50MM // T1.5]
      </div>
      <div className="absolute top-4 right-4 text-[9px] font-mono text-white/20 tracking-wider">
        [PL MOUNT]
      </div>
      <div className="absolute bottom-4 left-4 text-[9px] font-mono text-white/20 tracking-wider">
        [0.8 MOD GEAR]
      </div>
      <div className="absolute bottom-4 right-4 text-[9px] font-mono text-white/20 tracking-wider">
        [11-BLADE IRIS]
      </div>
    </div>
  );
};


import * as React from "react";
import { cn } from "@/lib/utils";

export interface SoundstageFallbackProps {
  className?: string;
}

export const SoundstageFallback: React.FC<SoundstageFallbackProps> = ({ className }) => {
  return (
    <div
      data-testid="soundstage-fallback"
      role="img"
      aria-label="Infinite Soundstage preview with director's chair under studio spotlight"
      className={cn(
        "relative w-full h-full min-h-[320px] sm:min-h-[420px] rounded-2xl overflow-hidden bg-[#07080A] flex items-center justify-center select-none border border-white/[0.06] shadow-2xl",
        className
      )}
    >
      {/* Studio Background & Atmospheric Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_55%_42%,rgba(233,180,87,0.12),rgba(10,12,16,0.95)_70%)]" />

      {/* Studio Grid / Cyclorama Floor Line */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#050608] via-[#090A0E] to-transparent pointer-events-none" />

      {/* Atmospheric Overhead Light Cone (SVG Beam) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-65 mix-blend-screen"
        preserveAspectRatio="none"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fallbackLightBeam" x1="0.55" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#FFE1B3" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#E9B457" stopOpacity="0.35" />
            <stop offset="75%" stopColor="#E9B457" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#E9B457" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="fallbackFloorPool" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E9B457" stopOpacity="0.38" />
            <stop offset="50%" stopColor="#E9B457" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#07080A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Volumetric Spotlight Cone */}
        <polygon points="560,40 260,520 680,520" fill="url(#fallbackLightBeam)" />

        {/* Floor Spotlight Ellipse Reflection */}
        <ellipse cx="470" cy="500" rx="190" ry="45" fill="url(#fallbackFloorPool)" />

        {/* Dolly Track Curve on Floor */}
        <path
          d="M 120 540 C 260 520, 520 520, 760 560"
          stroke="#474F5E"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />
        <path
          d="M 140 565 C 280 545, 540 545, 780 585"
          stroke="#474F5E"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />

        {/* Overhead Truss Rig Silhouette */}
        <rect x="220" y="24" width="460" height="14" rx="2" fill="#20242D" fillOpacity="0.75" />
        <rect x="240" y="38" width="420" height="4" fill="#2E333F" fillOpacity="0.6" />
        {/* Fresnel fixture clamp */}
        <rect x="546" y="38" width="16" height="24" rx="2" fill="#3D4452" />
        <ellipse cx="554" cy="62" rx="18" ry="12" fill="#E9B457" fillOpacity="0.85" />
      </svg>

      {/* Central Hero Silhouettes: Director's Chair & Cinema Camera */}
      <div className="relative z-10 w-full max-w-lg px-8 flex items-end justify-center h-full pb-16">
        <div className="relative w-72 h-64 sm:w-80 sm:h-72">
          {/* Director's Chair Silhouette */}
          <svg
            className="absolute left-6 bottom-4 w-44 h-56 drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)]"
            viewBox="0 0 160 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Scissor legs */}
            <line x1="38" y1="95" x2="108" y2="205" stroke="#1D2027" strokeWidth="6" strokeLinecap="round" />
            <line x1="108" y1="95" x2="38" y2="205" stroke="#1D2027" strokeWidth="6" strokeLinecap="round" />
            <circle cx="73" cy="150" r="4" fill="#E9B457" />

            {/* Backrest Posts & Canvas */}
            <line x1="38" y1="35" x2="38" y2="105" stroke="#181A20" strokeWidth="6" strokeLinecap="round" />
            <line x1="108" y1="35" x2="108" y2="105" stroke="#181A20" strokeWidth="6" strokeLinecap="round" />
            <circle cx="38" cy="34" r="5" fill="#E9B457" />
            <circle cx="108" cy="34" r="5" fill="#E9B457" />

            {/* Canvas Backrest */}
            <rect x="36" y="46" width="74" height="32" rx="3" fill="#14161C" stroke="#252934" strokeWidth="2" />
            {/* Canvas Seat */}
            <rect x="28" y="94" width="90" height="8" rx="2" fill="#14161C" stroke="#E9B457" strokeOpacity="0.3" strokeWidth="1.5" />
            {/* Armrests */}
            <rect x="24" y="74" width="34" height="6" rx="2" fill="#1D2027" />
            <rect x="88" y="74" width="34" height="6" rx="2" fill="#1D2027" />
            {/* Footrest */}
            <rect x="34" y="178" width="78" height="5" rx="1.5" fill="#181A20" />
          </svg>

          {/* 35mm Cinema Rig Silhouette (receding on right) */}
          <svg
            className="absolute right-0 bottom-4 w-36 h-48 opacity-80 drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]"
            viewBox="0 0 140 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Dolly Base */}
            <rect x="18" y="152" width="95" height="12" rx="3" fill="#181B22" />
            <circle cx="28" cy="166" r="6" fill="#0E1014" stroke="#485162" strokeWidth="2" />
            <circle cx="98" cy="166" r="6" fill="#0E1014" stroke="#485162" strokeWidth="2" />

            {/* Riser Column */}
            <rect x="58" y="98" width="16" height="56" rx="2" fill="#222631" />
            <rect x="54" y="92" width="24" height="8" rx="2" fill="#E9B457" fillOpacity="0.75" />

            {/* Camera Body & Matte Box */}
            <rect x="42" y="56" width="46" height="36" rx="4" fill="#15171D" stroke="#2B303D" strokeWidth="1.5" />
            <rect x="26" y="52" width="22" height="18" rx="2" fill="#181B22" />
            {/* Lens Barrel */}
            <rect x="86" y="64" width="20" height="20" rx="3" fill="#20242D" />
            {/* Matte Box Hood */}
            <polygon points="104,58 128,52 128,88 104,82" fill="#15171D" stroke="#363C4D" strokeWidth="1.5" />
            {/* Top Monitor */}
            <rect x="62" y="32" width="26" height="18" rx="2" fill="#1A202C" stroke="#E9B457" strokeOpacity="0.4" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Status Label (Discreet) */}
      <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/60 border border-white/10 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">
          Infinite Soundstage
        </span>
      </div>
    </div>
  );
};


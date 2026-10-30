import * as React from "react";
import { cn } from "@/lib/utils";

export interface GoldenReelFallbackProps {
  className?: string;
}

export const GoldenReelFallback: React.FC<GoldenReelFallbackProps> = ({ className }) => {
  return (
    <div
      data-testid="golden-reel-fallback"
      className={cn(
        "relative w-full h-full overflow-hidden bg-[#090A0D] pointer-events-none select-none",
        className
      )}
    >
      {/* Subtle Warm Brass Atmospheric Radial Glow */}
      <div
        className="absolute top-[8%] right-[12%] w-[680px] h-[520px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(222, 192, 133, 0.14) 0%, rgba(186, 149, 78, 0.05) 50%, transparent 75%)",
          filter: "blur(70px)",
        }}
      />

      {/* SVG Silhouette Representation of the Golden Reel & Filmstrip */}
      <div className="absolute inset-0 flex items-center justify-end pr-8 sm:pr-16 lg:pr-24 pointer-events-none opacity-45">
        <svg
          viewBox="0 0 800 600"
          className="w-full max-w-[720px] h-auto text-[#D8B878]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Filmstrip Curve */}
          <path
            d="M 640 160 C 580 200, 480 240, 420 320 C 380 370, 340 450, 310 520"
            stroke="#16181F"
            strokeWidth="90"
            strokeLinecap="round"
          />
          <path
            d="M 640 160 C 580 200, 480 240, 420 320 C 380 370, 340 450, 310 520"
            stroke="#C5A059"
            strokeWidth="2"
            strokeDasharray="8 8"
          />

          {/* Viewing Aperture Gate Frame */}
          <rect
            x="360"
            y="260"
            width="180"
            height="110"
            rx="6"
            fill="#FBE7C6"
            stroke="#12141A"
            strokeWidth="10"
          />

          {/* Silhouette Duel Preview in Fallback Gate */}
          <circle cx="410" cy="300" r="8" fill="#12141A" />
          <path d="M 410 308 L 410 335 L 425 352" stroke="#12141A" strokeWidth="5" strokeLinecap="round" />
          <path d="M 410 316 L 435 305" stroke="#12141A" strokeWidth="4" strokeLinecap="round" />
          <circle cx="480" cy="305" r="8" fill="#12141A" />
          <path d="M 480 313 L 480 338 L 470 352" stroke="#12141A" strokeWidth="5" strokeLinecap="round" />

          {/* Vintage Golden Reel Outer Rim & Cutout Flange */}
          <circle cx="620" cy="240" r="140" stroke="currentColor" strokeWidth="12" opacity="0.85" />
          <circle cx="620" cy="240" r="132" stroke="#8E6E32" strokeWidth="2" />
          <circle cx="620" cy="240" r="48" fill="#8E6E32" opacity="0.6" />
          <circle cx="620" cy="240" r="24" fill="#090A0D" />

          {/* Circular Cutouts in Reel Flange */}
          <circle cx="620" cy="155" r="28" fill="#090A0D" stroke="currentColor" strokeWidth="3" />
          <circle cx="694" cy="198" r="28" fill="#090A0D" stroke="currentColor" strokeWidth="3" />
          <circle cx="694" cy="282" r="28" fill="#090A0D" stroke="currentColor" strokeWidth="3" />
          <circle cx="620" cy="325" r="28" fill="#090A0D" stroke="currentColor" strokeWidth="3" />
          <circle cx="546" cy="282" r="28" fill="#090A0D" stroke="currentColor" strokeWidth="3" />
          <circle cx="546" cy="198" r="28" fill="#090A0D" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
};


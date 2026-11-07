import * as React from "react";

export const CinematicWorldFallback: React.FC = () => {
  return (
    <div
      data-testid="cinematic-world-fallback"
      className="absolute inset-0 w-full h-full bg-[#090A0D] overflow-hidden pointer-events-none select-none"
    >
      {/* Soft Ambient Cinematic Glows */}
      <div className="absolute top-1/4 right-[15%] w-[680px] h-[520px] rounded-full bg-[#E9B457]/10 blur-[140px]" />
      <div className="absolute bottom-1/3 right-[30%] w-[480px] h-[380px] rounded-full bg-[#8EB4FF]/06 blur-[120px]" />

      {/* Atmospheric Diagonal Light Beam Silhouette */}
      <div
        className="absolute -top-20 right-[20%] w-[260px] h-[120%] rotate-[28deg] bg-gradient-to-b from-[#FFAE4E]/10 via-[#FFAE4E]/03 to-transparent blur-[60px]"
      />

      {/* Stylized Story Fragment Silhouettes (Static Preview) */}
      <div className="absolute top-[22%] right-[12%] w-[420px] h-[180px] rounded-sm border border-white/[0.08] bg-white/[0.02] shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-[2px] hidden lg:block rotate-[-3deg]" />
      <div className="absolute top-[48%] right-[8%] w-[320px] h-[180px] rounded-sm border border-white/[0.06] bg-white/[0.015] shadow-[0_16px_48px_rgba(0,0,0,0.85)] backdrop-blur-[2px] hidden lg:block rotate-[-6deg]" />
      <div className="absolute top-[15%] right-[32%] w-[360px] h-[155px] rounded-sm border border-white/[0.04] bg-white/[0.01] shadow-[0_8px_32px_rgba(0,0,0,0.7)] hidden xl:block rotate-[2deg]" />
    </div>
  );
};


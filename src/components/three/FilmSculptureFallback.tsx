import * as React from "react";

export function FilmSculptureFallback({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative w-full h-full flex items-center justify-center pointer-events-none select-none ${className}`}
      aria-label="35mm Film Sculpture fallback"
    >
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full flex items-center justify-center">
        {/* Concentric Anamorphic Rings */}
        <div className="absolute inset-0 rounded-full border border-primary/25 animate-[spin_24s_linear_infinite]" />
        <div className="absolute inset-6 rounded-full border border-white/10 border-dashed animate-[spin_36s_linear_infinite_reverse]" />
        <div className="absolute inset-12 rounded-full border border-primary/35 shadow-[0_0_24px_rgba(233,180,87,0.18)]" />

        {/* 35mm Frame Gate Sculpture Silhouette */}
        <div className="relative w-36 h-48 rounded-lg border-2 border-primary/60 bg-gradient-to-br from-surface-elevated/80 to-surface-base/90 backdrop-blur-md p-2 flex flex-col justify-between shadow-noir-lg transform rotate-6">
          <div className="flex justify-between">
            <span className="w-2.5 h-1.5 rounded-sm bg-primary/70" />
            <span className="w-2.5 h-1.5 rounded-sm bg-primary/70" />
          </div>
          <div className="my-auto text-center space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary">
              STUDIO NOIR
            </div>
            <div className="text-[9px] font-mono text-muted-foreground/80">35MM GATE</div>
          </div>
          <div className="flex justify-between">
            <span className="w-2.5 h-1.5 rounded-sm bg-primary/70" />
            <span className="w-2.5 h-1.5 rounded-sm bg-primary/70" />
          </div>
        </div>

        {/* Projector Dust Motive Halos */}
        <div className="absolute top-10 right-12 w-2 h-2 rounded-full bg-primary/60 blur-[1px] animate-pulse" />
        <div className="absolute bottom-12 left-10 w-1.5 h-1.5 rounded-full bg-amber-200/50 blur-[1px] animate-pulse" />
      </div>
    </div>
  );
}

export default FilmSculptureFallback;


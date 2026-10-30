import * as React from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CinematicWorldControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
  className?: string;
}

export const CinematicWorldControls: React.FC<CinematicWorldControlsProps> = ({
  isPaused,
  onTogglePause,
  className,
}) => {
  return (
    <div
      data-testid="cinematic-world-controls"
      className={cn("pointer-events-auto", className)}
    >
      <button
        type="button"
        onClick={onTogglePause}
        aria-label={isPaused ? "Resume cinematic background motion" : "Pause cinematic background motion"}
        aria-pressed={isPaused}
        title={isPaused ? "Resume background animation" : "Pause background animation"}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#090A0E]/80 backdrop-blur-md text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-[#12151C]/90 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-noir-sm group cursor-pointer select-none"
      >
        {isPaused ? (
          <>
            <Play className="w-3 h-3 text-primary transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">Resume Motion</span>
          </>
        ) : (
          <>
            <Pause className="w-3 h-3 text-primary transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">Pause Motion</span>
          </>
        )}
      </button>
    </div>
  );
};


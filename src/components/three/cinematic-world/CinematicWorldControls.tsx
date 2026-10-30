import * as React from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CinematicWorldControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
  disabled?: boolean;
  className?: string;
}

export const CinematicWorldControls: React.FC<CinematicWorldControlsProps> = ({
  isPaused,
  onTogglePause,
  disabled = false,
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
        disabled={disabled}
        aria-label={
          disabled
            ? "Cinematic background motion unavailable"
            : isPaused
            ? "Resume cinematic background motion"
            : "Pause cinematic background motion"
        }
        aria-pressed={!disabled && isPaused}
        aria-disabled={disabled}
        title={
          disabled
            ? "Animation unavailable"
            : isPaused
            ? "Resume background animation"
            : "Pause background animation"
        }
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#090A0E]/80 backdrop-blur-md text-[11px] font-mono text-muted-foreground transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-noir-sm select-none",
          disabled
            ? "opacity-40 cursor-not-allowed border-white/5"
            : "hover:text-foreground hover:border-primary/40 hover:bg-[#12151C]/90 group cursor-pointer"
        )}
      >
        {isPaused ? (
          <>
            <Play className={cn("w-3 h-3 text-primary transition-transform", !disabled && "group-hover:scale-110")} />
            <span className="hidden sm:inline">Resume Motion</span>
          </>
        ) : (
          <>
            <Pause className={cn("w-3 h-3 text-primary transition-transform", !disabled && "group-hover:scale-110")} />
            <span className="hidden sm:inline">Pause Motion</span>
          </>
        )}
      </button>
    </div>
  );
};

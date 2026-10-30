import * as React from "react";
import { cn } from "@/lib/utils";

export interface GoldenReelFallbackProps { className?: string }
export const GoldenReelFallback: React.FC<GoldenReelFallbackProps> = ({ className }) => {
  const id = React.useId().replace(/:/g, "");
  return (
    <div data-testid="golden-reel-fallback" className={cn("relative w-full h-full overflow-hidden pointer-events-none select-none", className)}>
      <svg viewBox="0 0 600 520" aria-hidden="true" className="absolute inset-y-0 right-0 h-full w-full lg:w-1/2" fill="none">
        <defs>
          <linearGradient id={id + "gold"} x1="130" y1="90" x2="260" y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e5d0a0"/><stop offset="0.5" stopColor="#a88745"/><stop offset="1" stopColor="#53401f"/>
          </linearGradient>
          <mask id={id + "holes"}>
            <rect width="600" height="520" fill="white"/>
            {[0,1,2,3,4,5].map(i => <ellipse key={i} cx={180 + Math.cos(i * Math.PI / 3) * 38} cy={180 + Math.sin(i * Math.PI / 3) * 75} rx="14" ry="25" fill="black"/>)}
          </mask>
        </defs>
        <path d="M190 265 C240 340 285 315 330 135" stroke="#332819" strokeWidth="25"/>
        <ellipse cx="215" cy="180" rx="65" ry="119" stroke="#b89a5b" strokeWidth="7"/>
        <ellipse cx="180" cy="180" rx="65" ry="119" fill={"url(#" + id + "gold)"} mask={"url(#" + id + "holes)"}/>
        <ellipse cx="180" cy="180" rx="12" ry="20" fill="#796132" stroke="#d7bd7b"/>
        <path d="M330 90 C360 200 320 340 270 470 L410 510 C465 330 440 180 390 95 Z" fill="#15120f" stroke="#4f4028"/>
        <path d="M336 157 L400 164 L416 222 L339 209 Z" fill="#d8ba83"/>
        <path d="M330 237 L424 252 L425 327 L316 302 Z" fill="#ecd3a4"/>
        <path d="M305 330 L422 359 L403 460 L279 424 Z" fill="#efd6b1"/>
        <g stroke="#15120f" strokeLinecap="round" strokeWidth="6">
          <circle cx="332" cy="365" r="8" fill="#15120f"/><path d="M332 374 L330 398 L317 414 M330 398 L339 420 M333 382 L357 382"/>
          <circle cx="371" cy="375" r="8" fill="#15120f"/><path d="M371 384 L368 407 L355 423 M368 407 L378 429 M371 390 L357 382"/>
          <circle cx="346" cy="262" r="6" fill="#15120f"/><path d="M346 269 L344 286 L332 295 M344 280 L365 270"/>
          <circle cx="395" cy="276" r="6" fill="#15120f"/><path d="M395 283 L394 300 L404 313 M394 292 L378 290"/>
        </g>
      </svg>
    </div>
  );
};

import * as React from "react";

const mediaRoot = `${import.meta.env.BASE_URL}media/`;

export interface GoldenReelMediaProps {
  className?: string;
  isPaused?: boolean;
}

/**
 * Native video playback for the Golden Reel hero background.
 * Seamlessly loops the cinematic 16:9 video while respecting accessibility
 * (prefers-reduced-motion) and device power constraints.
 */
export function GoldenReelMedia({ className, isPaused }: GoldenReelMediaProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPaused || prefersReducedMotion) {
      video.pause();
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Handled: Autoplay policy or low power mode caught gracefully
        });
      }
    }
  }, [isPaused, prefersReducedMotion]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className || ""}`}
      data-testid="golden-reel-media"
      aria-hidden="true"
    >
      {prefersReducedMotion ? (
        <picture className="absolute inset-0 h-full w-full">
          <source srcSet={`${mediaRoot}main-reel-poster.webp`} type="image/webp" />
          <img
            src={`${mediaRoot}main-reel-poster.webp`}
            alt=""
            width={1120}
            height={630}
            draggable={false}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-contain"
          />
        </picture>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={`${mediaRoot}main-reel-poster.webp`}
          width={1120}
          height={630}
          className="absolute inset-0 h-full w-full object-contain"
        >
          <source src={`${mediaRoot}main-reel.mp4`} type="video/mp4" />
          <img
            src={`${mediaRoot}main-reel-poster.webp`}
            alt=""
            width={1120}
            height={630}
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </video>
      )}
    </div>
  );
}

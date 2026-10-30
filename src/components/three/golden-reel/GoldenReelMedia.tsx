const mediaRoot = `${import.meta.env.BASE_URL}media/`;

/** Native GIF playback; preserve the uploaded artwork and its full aspect ratio. */
export function GoldenReelMedia() {
  return <picture className="absolute inset-0 overflow-hidden" data-testid="golden-reel-media" aria-hidden="true">
    <source media="(prefers-reduced-motion: reduce)" srcSet={mediaRoot + "main-reel-poster.webp"} />
    <img
      src={mediaRoot + "main-reel.gif"}
      alt="" width={1120} height={630} draggable={false}
      decoding="async" fetchPriority="high"
      className="absolute inset-0 h-full w-full object-contain"
    />
  </picture>;
}

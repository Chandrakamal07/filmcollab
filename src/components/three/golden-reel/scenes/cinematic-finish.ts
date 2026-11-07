/** Layered amber scenery and film response, composited around the animated rigs. */
export function finishCinematicFrame(ctx: CanvasRenderingContext2D, w: number, h: number, genre: number, time: number) {
  ctx.save();
  // Multiplication retains the solid character contours while enriching the light.
  ctx.globalCompositeOperation = "multiply";
  const grade = ctx.createLinearGradient(0, 0, w, h);
  grade.addColorStop(0, "#875022"); grade.addColorStop(.45, "#f7bd62"); grade.addColorStop(.7, "#d79540"); grade.addColorStop(1, "#70431d");
  ctx.fillStyle = grade; ctx.fillRect(0, 0, w, h);
  // Receding architecture gives the silhouettes a place and a sense of scale.
  for (let layer = 0; layer < 3; layer++) {
    ctx.globalAlpha = .08 + layer * .025;
    ctx.fillStyle = "#241509";
    const baseline = h * (.67 + layer * .06);
    for (let i = 0; i < 23; i++) {
      const x = i * w / 22 + Math.sin(genre * 7 + i) * 8;
      const bh = (18 + (Math.sin(i * 13.7 + genre) + 1) * 29) * (1 + layer * .15);
      ctx.fillRect(x, baseline - bh, w / 26, bh);
      if (i % 6 === 0) {
        ctx.beginPath(); ctx.ellipse(x + w / 52, baseline - bh, w / 52, 12, 0, Math.PI, Math.PI * 2); ctx.fill();
        ctx.fillRect(x + w / 52 - 1, baseline - bh - 22, 2, 22);
      }
    }
  }
  // Perspective wet-ground streaks and warm distant practical lights.
  ctx.globalAlpha = .2;
  ctx.strokeStyle = "#543116"; ctx.lineWidth = .7;
  for (let i = 0; i < 22; i++) {
    const y = h * .82 + Math.pow(i / 22, 1.8) * h * .18;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 18; i++) {
    const x = ((i * 79.3) % w);
    const y = h * (.68 + Math.sin(i * 9) * .08);
    const light = ctx.createRadialGradient(x, y, 0, x, y, 9);
    light.addColorStop(0, "#ffdc87"); light.addColorStop(1, "rgba(230,138,38,0)");
    ctx.globalAlpha = .35 + Math.sin(time * 3 + i) * .08;
    ctx.fillStyle = light; ctx.fillRect(x - 9, y - 9, 18, 18);
  }
  // Slow ember drift; deterministic seeking and pause use the same scene clock.
  ctx.fillStyle = "#ffd78d"; ctx.globalAlpha = .35;
  for (let i = 0; i < 26; i++) {
    const x = (i * 97.7 + time * (7 + i % 4)) % w;
    const y = ((i * 47.3 - time * 12) % h + h) % h;
    ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, 1);
  }
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  const vignette = ctx.createRadialGradient(w * .5, h * .45, h * .15, w * .5, h * .45, w * .65);
  vignette.addColorStop(0, "rgba(18,8,2,0)"); vignette.addColorStop(1, "rgba(18,8,2,.72)");
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

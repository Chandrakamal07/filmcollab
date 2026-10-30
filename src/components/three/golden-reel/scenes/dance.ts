import { GenreDefinition } from "../types";

export const danceScene: GenreDefinition = {
  id: "dance",
  title: "Romance / Musical",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const groundY = height * 0.82;
    const centerX = width * 0.50;

    ctx.save();

    // Warm romantic rose-gold sunset backlight
    const bgGrad = ctx.createRadialGradient(
      centerX,
      height * 0.45,
      width * 0.05,
      centerX,
      height * 0.52,
      width * 0.65
    );
    bgGrad.addColorStop(0, "#FFF5EB");
    bgGrad.addColorStop(0.40, "#FEDEC8");
    bgGrad.addColorStop(0.75, "#E8A882");
    bgGrad.addColorStop(1, "#8E4E36");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Warm stage floor
    ctx.fillStyle = "#110E12";
    ctx.beginPath();
    ctx.rect(0, groundY, width, height - groundY);
    ctx.fill();

    // Silhouettes in rich charcoal
    ctx.fillStyle = "#0C0A0E";
    ctx.strokeStyle = "#0C0A0E";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Timing phases:
    // 0.0 - 0.25: Walk toward each other, reach out
    // 0.25 - 0.70: Join hands, perform full graceful spinning turn
    // 0.70 - 1.00: Settle into deep elegant dip / ballroom extension pose

    const dX = centerX;
    let turnAngle = 0;
    let dipAmount = 0;
    let separation = 0;

    if (progress < 0.25) {
      const p = progress / 0.25;
      separation = (1 - p) * width * 0.28 + width * 0.12;
      turnAngle = 0;
      dipAmount = 0;
    } else if (progress < 0.70) {
      const p = (progress - 0.25) / 0.45;
      separation = width * 0.12;
      turnAngle = p * Math.PI * 2; // full 360 degree spin
      dipAmount = 0;
    } else {
      const p = (progress - 0.70) / 0.30;
      const ease = Math.sin(p * Math.PI * 0.5);
      separation = width * 0.12 + ease * width * 0.06;
      turnAngle = Math.PI * 2;
      dipAmount = ease;
    }

    const leadX = dX - separation * 0.5 * Math.cos(turnAngle);
    const followX = dX + separation * 0.5 * Math.cos(turnAngle);
    const leadZ = Math.sin(turnAngle); // for z-order layering during spin
    const followZ = -leadZ;

    // Helper for lead (male in tailcoat/tuxedo)
    const drawLead = () => {
      ctx.save();
      ctx.translate(leadX, groundY);

      const lean = dipAmount * -0.15;
      ctx.rotate(lean);

      // Head with fedora/hairline
      ctx.beginPath();
      ctx.arc(0, -height * 0.44, height * 0.046, 0, Math.PI * 2);
      ctx.fill();

      // Slender tailored torso / waistcoat
      ctx.lineWidth = width * 0.038;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.38);
      ctx.lineTo(width * 0.01, -height * 0.20);
      ctx.stroke();

      // Tailcoat tails
      ctx.lineWidth = width * 0.022;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.22);
      ctx.quadraticCurveTo(-width * 0.05, -height * 0.14, -width * 0.07, -height * 0.06);
      ctx.stroke();

      // Legs in ballroom stride
      ctx.lineWidth = width * 0.028;
      ctx.beginPath();
      ctx.moveTo(width * 0.01, -height * 0.20);
      ctx.lineTo(-width * 0.04 - dipAmount * width * 0.04, -height * 0.10);
      ctx.lineTo(-width * 0.06 - dipAmount * width * 0.06, 0);

      ctx.moveTo(width * 0.01, -height * 0.20);
      ctx.lineTo(width * 0.04, -height * 0.08);
      ctx.lineTo(width * 0.05, 0);
      ctx.stroke();

      // Lead Arms (supporting partner's waist and holding hand)
      ctx.lineWidth = width * 0.022;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.36);
      ctx.lineTo(width * 0.07, -height * 0.26);
      ctx.lineTo(width * 0.12, -height * 0.24); // Hand to partner waist
      ctx.moveTo(0, -height * 0.36);
      ctx.lineTo(-width * 0.04, -height * 0.30);
      ctx.lineTo(width * 0.06, -height * 0.38); // Raised clasped hand
      ctx.stroke();

      ctx.restore();
    };

    // Helper for follow (female in flowing gown)
    const drawFollow = () => {
      ctx.save();
      ctx.translate(followX, groundY);

      const arch = dipAmount * 0.55; // arch back during dip
      ctx.rotate(arch);

      // Head with chignon
      ctx.beginPath();
      ctx.arc(0, -height * 0.41, height * 0.042, 0, Math.PI * 2);
      ctx.fill();

      // Slim bodice
      ctx.lineWidth = width * 0.030;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.36);
      ctx.lineTo(-width * 0.01, -height * 0.20);
      ctx.stroke();

      // Flowing Ballgown skirt flare
      ctx.beginPath();
      ctx.moveTo(-width * 0.01, -height * 0.20);
      const skirtWave = Math.sin(turnAngle * 2) * width * 0.04;
      ctx.quadraticCurveTo(
        width * 0.08 + skirtWave,
        -height * 0.10,
        width * 0.12 + skirtWave * 1.5,
        0
      );
      ctx.lineTo(-width * 0.08, 0);
      ctx.quadraticCurveTo(-width * 0.05, -height * 0.10, -width * 0.01, -height * 0.20);
      ctx.fill();

      // Arms: one on lead's shoulder, one raised in hand clasp
      ctx.lineWidth = width * 0.020;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.34);
      ctx.lineTo(-width * 0.06, -height * 0.28);
      ctx.lineTo(-width * 0.10, -height * 0.34); // On lead shoulder
      ctx.moveTo(0, -height * 0.34);
      ctx.lineTo(width * 0.05, -height * 0.32);
      ctx.lineTo(-width * 0.04, -height * 0.40); // Clasped high
      ctx.stroke();

      ctx.restore();
    };

    // Render with correct depth order during turn
    if (leadZ >= 0) {
      drawFollow();
      drawLead();
    } else {
      drawLead();
      drawFollow();
    }

    ctx.restore();
  },
};

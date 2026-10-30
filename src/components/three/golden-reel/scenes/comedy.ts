import { GenreDefinition } from "../types";

export const comedyScene: GenreDefinition = {
  id: "comedy",
  title: "Comedy / Slapstick",
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
    const groundY = height * 0.82;
    const centerX = width * 0.50;

    ctx.save();

    // Warm vaudeville spotlight background
    const bgGrad = ctx.createRadialGradient(
      centerX,
      height * 0.45,
      width * 0.05,
      centerX,
      height * 0.50,
      width * 0.65
    );
    bgGrad.addColorStop(0, "#FFF9E8");
    bgGrad.addColorStop(0.40, "#FFE8B8");
    bgGrad.addColorStop(0.75, "#F0C878");
    bgGrad.addColorStop(1, "#9E782E");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Stage boards floor
    ctx.fillStyle = "#12100E";
    ctx.fillRect(0, groundY, width, height - groundY);

    // Characters in rich silhouette
    ctx.fillStyle = "#0C0A08";
    ctx.strokeStyle = "#0C0A08";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Timing of the Bowler Hat Trick:
    // 0.00 - 0.20: Confident showman prep, hand on hat
    // 0.20 - 0.55: Tosses hat along true continuous ballistic trajectory
    // 0.55 - 0.75: Hat descends, performer reaches out with grand confidence but misses! Fumbles!
    // 0.75 - 1.00: Catches hat behind the back / near knee, takes an exaggerated triumphant bow

    let charX = centerX;
    let bowAngle = 0;
    let handOnHead = false;
    let hatX = centerX;
    let hatY = groundY - height * 0.44;
    let hatAngle = 0;
    const hatVisible = true;

    if (progress < 0.20) {
      // 1. Prep phase
      handOnHead = true;
      bowAngle = 0;
      hatX = charX + width * 0.01;
      hatY = groundY - height * 0.44;
      hatAngle = -0.1;
    } else if (progress < 0.55) {
      // 2. Ballistic flight phase:
      // t_flight ranges 0.0 -> 1.0
      const t = (progress - 0.20) / 0.35;
      handOnHead = false;
      bowAngle = 0;

      // Parabolic flight: x travels from charX to charX + width*0.12
      // y launches upward (apex at t = 0.5), then falls down
      const startX = charX + width * 0.01;
      const vX = width * 0.14;
      hatX = startX + vX * t;

      const launchY = groundY - height * 0.44;
      const vY = -height * 0.60; // initial upward velocity
      const gravity = height * 1.20; // downward acceleration
      hatY = launchY + vY * t + 0.5 * gravity * t * t;

      hatAngle = t * Math.PI * 3.0; // spinning in flight
    } else if (progress < 0.75) {
      // 3. The comedic miss / fumble:
      const p = (progress - 0.55) / 0.20;
      handOnHead = false;

      // Hat falls past hands toward knees
      hatX = charX + width * 0.15 - p * width * 0.04;
      hatY = groundY - height * 0.24 + p * height * 0.12;
      hatAngle = Math.PI + Math.sin(p * Math.PI * 4) * 0.4;

      // Character lunges comically off balance
      charX = centerX + Math.sin(p * Math.PI) * width * 0.04;
      bowAngle = 0.25 * Math.sin(p * Math.PI);
    } else {
      // 4. Recovery & Exaggerated Theatrical Bow:
      const p = (progress - 0.75) / 0.25;
      const easeBow = Math.sin(p * Math.PI * 0.5);

      bowAngle = easeBow * 0.75; // deep exaggerated bow
      charX = centerX;

      // Hat held proudly in hand during bow
      hatX = charX - width * 0.08 - easeBow * width * 0.06;
      hatY = groundY - height * 0.18 + easeBow * height * 0.08;
      hatAngle = easeBow * -0.6;
    }

    // Helper: Draw Bowler Hat
    const drawHat = (hx: number, hy: number, angle: number) => {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(angle);

      ctx.fillStyle = "#0A0807";
      // Brim
      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.042, height * 0.012, 0, 0, Math.PI * 2);
      ctx.fill();
      // Crown
      ctx.beginPath();
      ctx.arc(0, -height * 0.022, width * 0.026, Math.PI, 0);
      ctx.lineTo(width * 0.026, 0);
      ctx.lineTo(-width * 0.026, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    // Draw Performer Character
    ctx.save();
    ctx.translate(charX, groundY);

    // Torso / Bow
    ctx.save();
    ctx.translate(0, -height * 0.18); // hip pivot
    ctx.rotate(bowAngle);

    // Head
    ctx.beginPath();
    ctx.arc(0, -height * 0.24, height * 0.046, 0, Math.PI * 2);
    ctx.fill();

    // Torso in tailored suit
    ctx.lineWidth = width * 0.038;
    ctx.beginPath();
    ctx.moveTo(0, -height * 0.20);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Arms
    ctx.lineWidth = width * 0.022;
    if (handOnHead) {
      // Right arm up touching hat brim
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(width * 0.08, -height * 0.22);
      ctx.lineTo(width * 0.02, -height * 0.28);
      // Left arm poised on hip
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(-width * 0.07, -height * 0.14);
      ctx.lineTo(-width * 0.02, -height * 0.06);
      ctx.stroke();
    } else if (progress < 0.55) {
      // Toss follow-through: right arm flung high
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(width * 0.06, -height * 0.28);
      ctx.lineTo(width * 0.10, -height * 0.38);
      // Left arm balancing
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(-width * 0.08, -height * 0.18);
      ctx.stroke();
    } else if (progress < 0.75) {
      // Flailing arms trying to catch
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(width * 0.09, -height * 0.12);
      ctx.lineTo(width * 0.14, -height * 0.06);
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(width * 0.05, -height * 0.10);
      ctx.stroke();
    } else {
      // Theatrical Bow Arms: one arm back holding hat, other sweeping forward
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(-width * 0.08, -height * 0.10);
      ctx.lineTo(-width * 0.14, 0); // Holds hat
      ctx.moveTo(0, -height * 0.18);
      ctx.lineTo(width * 0.08, -height * 0.12);
      ctx.lineTo(width * 0.14, -height * 0.22); // Flourish hand
      ctx.stroke();
    }

    ctx.restore(); // end torso rotation

    // Legs: Charlie Chaplin style stance (heels together, toes pointed out)
    ctx.lineWidth = width * 0.030;
    ctx.beginPath();
    ctx.moveTo(0, -height * 0.18);
    ctx.lineTo(-width * 0.04, -height * 0.08);
    ctx.lineTo(-width * 0.07, 0); // left foot turned out

    ctx.moveTo(0, -height * 0.18);
    ctx.lineTo(width * 0.04, -height * 0.08);
    ctx.lineTo(width * 0.07, 0); // right foot turned out
    ctx.stroke();

    ctx.restore(); // end performer translation

    // Draw the hat
    if (hatVisible) {
      drawHat(hatX, hatY, hatAngle);
    }

    ctx.restore();
  },
};

// A short, dependency-free confetti burst for a successful project submission.
// Draws on a temporary full-screen canvas appended to <body> (so it survives the
// route change that follows a submit), ignores pointer events, and removes
// itself when done. Skipped entirely under prefers-reduced-motion.

// Ekoa clay, leaf, sky and sage (tailwind.config.js), lifted a little so they pop,
// plus a warm gold. No cream or dark moss: those wash out or vanish on the page.
const COLOURS = ['#E0814F', '#7FA040', '#3F8FA3', '#E8B54A', '#9DB06A', '#D9604A'];
const DURATION_MS = 2600;
const COUNT = 90;

interface Piece { x: number; y: number; vx: number; vy: number; w: number; h: number; rot: number; vr: number; colour: string }

export function fireConfetti(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position:fixed;inset:0;width:${W}px;height:${H}px;pointer-events:none;z-index:9999`;
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const pieces: Piece[] = Array.from({ length: COUNT }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7;
    const speed = 9 + Math.random() * 9;
    return {
      x: fromLeft ? W * 0.1 : W * 0.9, y: H * 0.85,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.3,
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    if (t >= DURATION_MS) { canvas.remove(); return; }
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = t > DURATION_MS - 700 ? Math.max(0, (DURATION_MS - t) / 700) : 1;
    for (const p of pieces) {
      p.vy += 0.28; p.vx *= 0.99; p.vy *= 0.99;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.colour;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// The leaf on the landing page, lit from behind. It starts almost dark; as you scroll, light
// spreads outward from behind the gecko, the veins glow, and the gecko's shadow appears in
// its pose as the light rises. At full light the canvas shows the hero photo exactly, so
// the 1.5B moment sits over the same picture as before.

export const PHOTO = { w: 1024, h: 765 };
/** Where the light comes from, in photo pixels: just behind the gecko. */
const LIGHT: [number, number] = [705, 405];
/** The darkness the leaf starts in: the stage colour. */
const DARK = '23,28,20';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

export class BacklightScene {
  private ctx: CanvasRenderingContext2D;
  private glow = document.createElement('canvas');
  private gctx = this.glow.getContext('2d')!;
  /** The leaf with the gecko removed, and the original photo. */
  private plate = new Image();
  private photo = new Image();
  private ready = false;
  private progress = 0;
  private drawn = -1;

  constructor(private canvas: HTMLCanvasElement, src: { plate: string; photo: string }) {
    this.ctx = canvas.getContext('2d')!;
    let n = 0;
    const done = () => {
      if (++n < 2) return;
      this.ready = true;
      this.drawn = -1;
      this.render();
    };
    for (const [img, url] of [[this.plate, src.plate], [this.photo, src.photo]] as const) {
      img.decoding = 'async';
      img.onload = done;
      img.src = url;
    }
  }

  /** Match the canvas to its CSS box. */
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.canvas.width = this.glow.width = Math.round(w * dpr);
    this.canvas.height = this.glow.height = Math.round(h * dpr);
    this.drawn = -1;
    this.render();
  }

  /** 0 = the leaf in near darkness, 1 = fully lit, exactly the photo. */
  set(p: number) {
    this.progress = clamp(p);
    this.render();
  }

  private render() {
    if (!this.ready || this.drawn === this.progress) return;
    this.drawn = this.progress;
    const { ctx, gctx, canvas } = this;
    const W = canvas.width, H = canvas.height, k = W / PHOTO.w;
    const e = smooth(this.progress);
    const cx = LIGHT[0] * k, cy = LIGHT[1] * k, diag = Math.hypot(W, H);

    // 1. The leaf. The shadow only shows once there is light to cast it.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(this.plate, 0, 0, W, H);
    const shadow = smooth(clamp((this.progress - 0.3) / 0.5));
    if (shadow > 0) {
      ctx.globalAlpha = shadow;
      ctx.drawImage(this.photo, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (e >= 1) return;

    // 2. The glow: the leaf screened onto itself around the light, so the veins brighten.
    // It swells while the light is rising and settles back to nothing at full light.
    const g = Math.pow(Math.sin(Math.PI * e), 1.2) * 0.75;
    const R = diag * (0.08 + 0.8 * e);
    if (g > 0.01) {
      gctx.globalCompositeOperation = 'source-over';
      gctx.clearRect(0, 0, W, H);
      gctx.drawImage(canvas, 0, 0);
      gctx.globalCompositeOperation = 'destination-in';
      const mask = gctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      mask.addColorStop(0, 'rgba(0,0,0,1)');
      mask.addColorStop(0.45, 'rgba(0,0,0,.5)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      gctx.fillStyle = mask;
      gctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = g;
      ctx.drawImage(this.glow, 0, 0);
      ctx.globalAlpha = 1;
      // a faint warm core, like sun through the leaf
      const warm = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.7);
      warm.addColorStop(0, `rgba(255,236,170,${0.22 * g})`);
      warm.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 3. The darkness, thinnest at the light and deepest at the edges, lifting as it rises.
    const centre = 0.94 * Math.pow(1 - e, 1.6);
    const edge = 0.94 * Math.pow(1 - e, 0.3);
    const dark = ctx.createRadialGradient(cx, cy, 0, cx, cy, diag * (0.18 + 0.85 * e));
    dark.addColorStop(0, `rgba(${DARK},${centre})`);
    dark.addColorStop(1, `rgba(${DARK},${edge})`);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, W, H);
  }
}

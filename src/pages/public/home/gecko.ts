// The gecko on the landing page. Its shadow is cut from the hero photo into a body, head,
// tail and four legs (public/img/home/gecko-parts.png), then drawn onto the leaf with a
// multiply blend, the way a real shadow darkens a backlit leaf. It walks in from beyond the
// bottom-right edge with a trotting gait: legs swing in diagonal pairs, driven by the
// distance travelled so the feet never skate. When it settles, the real photo fades back in,
// so the resting gecko is exactly the one in the picture.

type PartKey = 'body' | 'head' | 'fr' | 'fl' | 'br' | 'bl' | 'tail';
interface Part { sx: number; sy: number; w: number; h: number; x: number; y: number; pivot?: [number, number] }

// Measured from public/img/gecko-hero.jpg (1024 × 765), in image pixels. Each limb overlaps
// the body around its joint, so turning it never opens a gap.
export const PHOTO = { w: 1024, h: 765 };
const PARTS: Record<PartKey, Part> = {
  body: { sx: 0, sy: 0, w: 202, h: 200, x: 593, y: 337 },
  head: { sx: 0, sy: 200, w: 83, h: 100, x: 582, y: 282, pivot: [650, 352] },
  fr: { sx: 0, sy: 300, w: 75, h: 105, x: 655, y: 275, pivot: [688, 360] },
  fl: { sx: 0, sy: 405, w: 95, h: 82, x: 563, y: 365, pivot: [638, 394] },
  br: { sx: 0, sy: 487, w: 110, h: 75, x: 757, y: 337, pivot: [776, 388] },
  bl: { sx: 0, sy: 562, w: 64, h: 112, x: 703, y: 427, pivot: [737, 446] },
  tail: { sx: 0, sy: 674, w: 86, h: 137, x: 761, y: 403, pivot: [792, 420] },
};
/** Drawn back to front, so the legs and head sit over the body. */
const ORDER: PartKey[] = ['tail', 'bl', 'br', 'body', 'fl', 'fr', 'head'];
/** The body's centre and the direction the head points, in image space. */
const CENTRE: [number, number] = [720, 410];
const HEADING = Math.atan2(-0.52, -0.86);
// Right-side legs swing forward with a negative turn, left-side legs with a positive one.
// Diagonal pairs (front-right with back-left) move together, as in a trot.
const GAIT: Partial<Record<PartKey, { amp: number; phase: number }>> = {
  fr: { amp: -0.34, phase: 0 },
  bl: { amp: 0.3, phase: 0 },
  fl: { amp: 0.34, phase: Math.PI },
  br: { amp: -0.3, phase: Math.PI },
};
/** Image pixels travelled per full stride. */
const STRIDE = 74;

// The path: a cubic curve from off the bottom-right into the photo's pose, ending on its heading.
const P0: [number, number] = [1390, 830];
const P1: [number, number] = [1160, 640];
const P2: [number, number] = [CENTRE[0] + 0.86 * 210, CENTRE[1] + 0.52 * 210];
const P3 = CENTRE;
const bez = (t: number, i: 0 | 1) => {
  const u = 1 - t;
  return u * u * u * P0[i] + 3 * u * u * t * P1[i] + 3 * u * t * t * P2[i] + t * t * t * P3[i];
};
const bezD = (t: number, i: 0 | 1) => {
  const u = 1 - t;
  return 3 * u * u * (P1[i] - P0[i]) + 6 * u * t * (P2[i] - P1[i]) + 3 * t * t * (P3[i] - P2[i]);
};
// Arc-length table, so equal steps of progress cover equal distance.
const ARC: number[] = (() => {
  const out = [0];
  let px = bez(0, 0), py = bez(0, 1);
  for (let k = 1; k <= 200; k++) {
    const t = k / 200, x = bez(t, 0), y = bez(t, 1);
    out.push(out[k - 1] + Math.hypot(x - px, y - py));
    px = x; py = y;
  }
  return out;
})();
const LENGTH = ARC[ARC.length - 1];
const tAt = (s: number) => {
  const d = s * LENGTH;
  let k = 1;
  while (k < ARC.length - 1 && ARC[k] < d) k++;
  const f = (d - ARC[k - 1]) / Math.max(1e-6, ARC[k] - ARC[k - 1]);
  return (k - 1 + f) / 200;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/** Geckos move in bursts. Three dashes with short pauses, the last one easing into place. */
function dash(p: number) {
  const segs: [number, number, number, number][] = [
    // [progress from, progress to, distance from, distance to]
    [0, 0.3, 0, 0.42],
    [0.38, 0.66, 0.42, 0.8],
    [0.74, 1, 0.8, 1],
  ];
  for (let i = 0; i < segs.length; i++) {
    const [a, b, s0, s1] = segs[i];
    if (p < a) return segs[i - 1]?.[3] ?? 0;
    if (p <= b) {
      const k = (p - a) / (b - a);
      // ease in and out of every dash; the final one lands softly
      const e = i === segs.length - 1 ? 1 - Math.pow(1 - k, 3) : smooth(k);
      return s0 + (s1 - s0) * e;
    }
  }
  return 1;
}

export class GeckoScene {
  private ctx: CanvasRenderingContext2D;
  private layer = document.createElement('canvas');
  private lctx = this.layer.getContext('2d')!;
  private plate = new Image();
  private photo = new Image();
  private atlas = new Image();
  private ready = false;
  private progress = -1;
  private drawn = -2;
  private scale = 1;

  constructor(private canvas: HTMLCanvasElement, src: { plate: string; photo: string; atlas: string }, private onReady?: () => void) {
    this.ctx = canvas.getContext('2d')!;
    let n = 0;
    const done = () => {
      if (++n < 3) return;
      this.ready = true;
      this.drawn = -2;
      this.render();
      this.onReady?.();
    };
    for (const [img, url] of [[this.plate, src.plate], [this.photo, src.photo], [this.atlas, src.atlas]] as const) {
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
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.layer.width = this.canvas.width;
    this.layer.height = this.canvas.height;
    this.scale = this.canvas.width / PHOTO.w;
    this.drawn = -2;
    this.render();
  }

  /** 0 = still off screen, 1 = settled in the photo's pose. */
  set(p: number) {
    this.progress = clamp(p);
    this.render();
  }

  private render() {
    if (!this.ready || this.drawn === this.progress) return;
    this.drawn = this.progress;
    const { ctx, lctx, scale } = this;
    const W = this.canvas.width, H = this.canvas.height;
    const p = this.progress;

    // walking until 0.94, then the real photo takes over
    const walk = clamp(p / 0.94);
    const settle = smooth(clamp((p - 0.9) / 0.1));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(this.plate, 0, 0, W, H);
    if (settle >= 1) {
      ctx.drawImage(this.photo, 0, 0, W, H);
      return;
    }

    const s = dash(walk);
    const t = tAt(s);
    const x = bez(t, 0), y = bez(t, 1);
    const dir = Math.atan2(bezD(t, 1), bezD(t, 0));
    let turn = dir - HEADING;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    const phase = ((s * LENGTH) / STRIDE) * Math.PI * 2;
    // gait amplitude fades out on the last stretch so the legs land in the photo's pose
    const amp = 1 - smooth(clamp((s - 0.9) / 0.1));
    // between dashes the head looks around
    const pause = walk > 0.3 && walk < 0.38 ? Math.sin(((walk - 0.3) / 0.08) * Math.PI) : walk > 0.66 && walk < 0.74 ? -Math.sin(((walk - 0.66) / 0.08) * Math.PI) : 0;

    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, W, H);
    // move the whole animal: rotate about its centre, then place it on the path
    const sway = Math.sin(phase) * 0.045 * amp;
    lctx.setTransform(scale, 0, 0, scale, 0, 0);
    lctx.translate(x, y);
    lctx.rotate(turn + sway);
    lctx.translate(-CENTRE[0], -CENTRE[1]);

    for (const k of ORDER) {
      const part = PARTS[k];
      let a = 0;
      const g = GAIT[k];
      if (g) a = g.amp * Math.sin(phase + g.phase) * amp;
      // the spine bends against the stride: head and tail swing opposite each other
      if (k === 'head') a = -Math.sin(phase) * 0.1 * amp + pause * 0.16;
      if (k === 'tail') a = Math.sin(phase + 0.6) * 0.16 * amp - pause * 0.05;
      lctx.save();
      if (part.pivot && a) {
        lctx.translate(part.pivot[0], part.pivot[1]);
        lctx.rotate(a);
        lctx.translate(-part.pivot[0], -part.pivot[1]);
      }
      lctx.drawImage(this.atlas, part.sx, part.sy, part.w, part.h, part.x, part.y, part.w, part.h);
      lctx.restore();
    }

    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.layer, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    if (settle > 0) {
      ctx.globalAlpha = settle;
      ctx.drawImage(this.photo, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
}

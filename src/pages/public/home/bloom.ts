// The opening: the Ekoa wordmark on a dark field. As you scroll, its O blooms open with an
// organic, moss-rimmed edge and the field dissolves onto the leaf underneath. The flooded
// area is transparent, so the gecko canvas below shows through.

import { WORDMARK } from '@/components/EkoaLogo';

/** Centre of the O inside the wordmark's 433 × 134 viewBox, as fractions. */
const O_CX = 0.61;
const O_CY = 0.49;

const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }';
const FS = `precision highp float;
uniform vec2 uRes, uO, uM; uniform float uBloom, uTime; uniform vec4 uBox; uniform sampler2D uTex;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
float mark(vec2 uv){ vec2 t=(uv-uBox.xy)/uBox.zw; if(t.x<0.||t.y<0.||t.x>1.||t.y>1.) return 0.; return texture2D(uTex, vec2(t.x,1.-t.y)).a; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y; vec2 pa = vec2(uv.x*asp, uv.y);
  float b = uBloom, t = uTime*.12;
  vec2 w = vec2(fbm(pa*2.2+t), fbm(pa*2.2+7.3-t)) - .5;
  float md = length((uv-uM)*vec2(asp,1.));
  vec2 q = uv + w*(.004 + smoothstep(.22,0.,md)*.012*(1.-b) + b*b*.16);
  q = uO + (q-uO)/(1.+b*b*b*9.);
  float m = smoothstep(.35,.65, mark(q));
  float r = length((uv-uO)*vec2(asp,1.));
  float edge = fbm(pa*2.2 + w*2.4 + t)*.9 + fbm(pa*9.-t)*.18;
  float front = b*2.4 - r - edge*(.25+b*.6);
  float flood = smoothstep(0., .01, front);
  float rim = (smoothstep(-.09, 0., front) - flood) * step(.001, b);
  vec3 col = mix(vec3(.09,.11,.078), vec3(.953,.933,.89), m);
  col = mix(col, vec3(.306,.365,.275), clamp(rim*1.2,0.,1.));
  col += (h(gl_FragCoord.xy + uTime) - .5) * .03;
  float a = 1. - flood;
  gl_FragColor = vec4(col*a, a);
}`;

export class Bloom {
  bloom = 0;
  mx = 0.5;
  my = 0.5;
  on = true;
  private gl: WebGLRenderingContext | null = null;
  private uni: Record<string, WebGLUniformLocation | null> = {};
  private ok = false;
  private dead = false;
  private raf = 0;

  /** Calls onFail when WebGL is unavailable, so the caller can show the plain wordmark. */
  constructor(private canvas: HTMLCanvasElement, onFail: () => void) {
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    } catch {
      gl = null;
    }
    if (!gl) {
      onFail();
      return;
    }
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const o = gl!.createShader(type)!;
      gl!.shaderSource(o, src);
      gl!.compileShader(o);
      if (!gl!.getShaderParameter(o, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(o) ?? 'shader');
      return o;
    };
    try {
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const k of ['uRes', 'uBloom', 'uTime', 'uBox', 'uO', 'uM', 'uTex']) this.uni[k] = gl.getUniformLocation(prog, k);
    } catch {
      onFail();
      return;
    }
    // Rasterise the wordmark into a texture.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 433 134" width="2165" height="670"><path fill="#fff" fill-rule="evenodd" d="${WORDMARK}"/></svg>`;
    const img = new Image();
    img.onload = () => {
      if (this.dead) return;
      const c = document.createElement('canvas');
      c.width = 2165;
      c.height = 670;
      c.getContext('2d')!.drawImage(img, 0, 0, 2165, 670);
      const tex = gl!.createTexture();
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, c);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.uniform1i(this.uni.uTex, 0);
      this.ok = true;
      this.resize();
    };
    img.onerror = onFail;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const loop = (t: number) => {
      this.draw(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  resize() {
    const { gl, canvas } = this;
    if (!gl || !this.ok) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(this.uni.uRes, canvas.width, canvas.height);
    const mw = Math.min(w * (w < 700 ? 0.8 : 0.6), 900), mh = (mw * 134) / 433;
    const bx = (w - mw) / 2 / w, by = (h - mh) / 2 / h;
    gl.uniform4f(this.uni.uBox, bx, by, mw / w, mh / h);
    gl.uniform2f(this.uni.uO, bx + (O_CX * mw) / w, 1 - (by + (O_CY * mh) / h));
  }

  private draw(t: number) {
    const { gl } = this;
    if (!gl || !this.ok || !this.on) return;
    gl.uniform1f(this.uni.uBloom, this.bloom);
    gl.uniform1f(this.uni.uTime, t / 1000);
    gl.uniform2f(this.uni.uM, this.mx, this.my);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    // The context is left alive: React may mount the page again on the same canvas.
    cancelAnimationFrame(this.raf);
    this.dead = true;
    this.ok = false;
  }
}

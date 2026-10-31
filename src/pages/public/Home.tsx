import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import { listOrgs, listPublicRecords, listSchoolRanking } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { config } from '@/lib/config';
import { CATEGORIES, EKOA_LETTERS, METRIC_LIBRARY, ROLES, STAGES, TEMPLATES } from '@/lib/ekoa';
import { EkoaMark, EkoaWordmark } from '@/components/EkoaLogo';
import { RecordTag } from '@/components/RecordTag';
import { Bloom } from './home/bloom';
import { GeckoScene, PHOTO } from './home/gecko';
import './home/home.css';

gsap.registerPlugin(ScrollTrigger);

// The landing page: the wordmark blooms open onto the leaf, the gecko walks in, the problem
// lands, then paper slides over and the page shifts between paper, moss and deep green.
// The rest of the site (header aside) and the member app are untouched.

const NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/network', label: 'Network' },
  { to: '/library', label: 'Library' },
  { to: '/ranking', label: 'Ranking' },
  { to: '/reports', label: 'Reports' },
  { to: '/about', label: 'About' },
];

const PROBLEMS: [string, string, string][] = [
  ['Continuity', 'Projects restart every year', 'When student leaders graduate, their sustainability initiatives often disappear entirely. Schools lose institutional memory and start from scratch.'],
  ['Connection', 'No cross-border collaboration', 'Thousands of eco clubs operate in isolation. A solution that works in Singapore never reaches São Paulo, not because of distance, but because there is no infrastructure to connect them.'],
  ['Implementation', 'Awareness without implementation', 'Schools host sustainability weeks and awareness campaigns, but rarely move into measurable, lasting change. Intent is abundant. Execution infrastructure is not.'],
];
const COMPARISON: [string, string][] = [
  ['Localised', 'Global'],
  ['Awareness campaigns', 'Implementation systems'],
  ['Short-term leadership', 'Continuity infrastructure'],
  ['Isolated projects', 'Cross-school scalability'],
  ['Participation metrics', 'Impact metrics'],
];
const AUDIENCE: [string, string][] = [
  ['Schools and school networks', 'Schools'],
  ['Sustainability coordinators and eco clubs', 'Clubs'],
  ['Student leaders and youth organisations', 'Students'],
  ['Climate-focused NGOs and partners', 'Partners'],
  ['Educators and advisors', 'Educators'],
  ['ESG and sustainability institutions', 'Institutions'],
];
const METHOD: { word: string; t: string; p: string; facts: [string, string, boolean?][] }[] = [
  { word: 'Evidence', t: 'A stage only closes when its evidence is in place.', p: 'Each stage has a gate. The platform ticks what it can check, and people tick the rest.', facts: [['Identify', 'Baseline collected on the library protocol (at least 5 school days)'], ['Design', 'Budget planned per line, or marked zero-cost'], ['Implement', 'At least 4 weeks of measurements logged']] },
  { word: 'Sign-off', t: 'And the right person signs it off.', p: 'No sustainability head needed. The minimum team is one teacher and one student.', facts: [['Project Lead', 'Any student. Co-leads are fine', true], ['Faculty Liaison', 'Any teacher. The one adult every school needs', true], ['Ekoa Representative', 'Links the school to circles and other schools']] },
  { word: 'Verified', t: 'Every result carries a verification tier.', p: 'No school ever audits its own work. Auditors see numbers and evidence, never people.', facts: [['T0 · T1', 'Self-reported · Evidence attached'], ['T2', 'Faculty-verified'], ['T3', 'Peer-audited by Shiv Nadar School, Faridabad or Green School, Bali', true], ['T4', 'Partner-verified']] },
  { word: 'Handover', t: 'The next Project Lead is named before the work moves on.', p: 'So a leadership change doesn’t mean starting over.', facts: [['Implement gate', 'Next Project Lead named, so the work survives graduation'], ['Handover packets', 'Keep what a team learned long after it graduates']] },
  { word: 'Record', t: 'Every project ends as an Implementation Record.', p: 'Failures included. The lessons are the result.', facts: [['Worked', 'Met or beat its target'], ['Partly worked', 'Moved the metric but missed the target'], ['Did not work', 'Stopped or failed. The lessons are the result', true], ['Too early to tell', 'Not enough data yet']] },
  { word: 'Ranked', t: 'Schools are ranked on verified impact.', p: 'Scored only on verified, named, public records and on adoptions by other schools. Sign-ups don’t count.', facts: [['Counts', 'Verified, named, public records'], ['Counts', 'Adoptions by other schools'], ['Doesn’t count', 'Sign-ups', true]] },
];
const CATS = CATEGORIES.map((name) => ({
  name,
  metrics: METRIC_LIBRARY.filter((m) => m.category === name.toLowerCase()),
  templates: TEMPLATES.filter((t) => t.category === name),
  note: name === 'Policy & governance' ? EKOA_LETTERS[3].platform : undefined,
}));

const pad = (n: number) => String(n).padStart(2, '0');
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const signer = (s: (typeof STAGES)[number]) => (s.signer === 'automatic' ? 'Automatic on publish' : ROLES[s.signer].label);

/** Wraps each word so it can rise into view. */
function W({ t }: { t: string }) {
  const parts = t.split(/(\s+)/).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (/^\s+$/.test(p) ? ' ' : <span key={i} className="w"><span>{p}</span></span>))}
    </>
  );
}

// The wheel's geometry, in its own -320..320 viewBox.
const R1 = 190, R2 = 290, GAP = 1.6;
const pt = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)];
const SEGMENTS = STAGES.map((s, i) => {
  const a0 = ((i * 60 - 120 + GAP) * Math.PI) / 180, a1 = ((i * 60 - 60 - GAP) * Math.PI) / 180;
  const [x0, y0] = pt(R2, a0), [x1, y1] = pt(R2, a1), [x2, y2] = pt(R1, a1), [x3, y3] = pt(R1, a0);
  const am = ((i * 60 - 90) * Math.PI) / 180, deg = i * 60, flip = deg > 90 && deg < 270 ? 180 : 0;
  const [tx, ty] = pt((R1 + R2) / 2 + 14, am), [nx, ny] = pt((R1 + R2) / 2 - 22, am);
  return { name: s.name, d: `M${x0} ${y0} A${R2} ${R2} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${R1} ${R1} 0 0 0 ${x3} ${y3} Z`, tx, ty, nx, ny, rot: deg + flip };
});
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = (i * Math.PI) / 36, [x1, y1] = pt(160, a), [x2, y2] = pt(i % 12 === 0 ? 178 : 170, a);
  return { x1, y1, x2, y2 };
});

/** Odometer column: rolls through ten digits and lands on the target. */
function Strip({ to }: { to: number }) {
  const seq = Array.from({ length: 11 + to }, (_, k) => k % 10);
  return (
    <span className="col">
      <span className="strip" data-n={seq.length - 1}>
        {seq.map((d, k) => <span key={k}>{d}</span>)}
      </span>
    </span>
  );
}

export default function Home() {
  const { person } = useAuth();
  const { data } = useData(async () => {
    const [records, orgs, ranking] = await Promise.all([listPublicRecords(), listOrgs('school'), listSchoolRanking()]);
    return { records, orgs: orgs.filter((o) => o.public_visible), ranking };
  });
  const records = data?.records ?? [];
  const orgName = (id: string) => data?.orgs.find((o) => o.id === id)?.name;
  const failed = records.find((r) => r.outcome_class === 'did_not_work');
  const others = records.filter((r) => r.id !== failed?.id).slice(0, 3);
  const schools = data?.orgs.filter((o) => !o.audit_school) ?? [];
  const countries = new Set(schools.map((o) => o.country)).size;
  const failures = records.filter((r) => r.outcome_class === 'did_not_work' || r.outcome_class === 'partly').length;

  const root = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wheel = useRef<{ turnTo: (i: number) => void; step: (d: number) => void; moved: () => boolean } | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [letter, setLetter] = useState(0);
  const [stage, setStage] = useState(0);
  const [cats, setCats] = useState<Set<number>>(new Set());
  const [menu, setMenu] = useState(false);
  const [navOn, setNavOn] = useState(false);
  const [section, setSection] = useState({ n: 1, label: 'Opening' });

  useEffect(() => {
    const el = root.current!;
    const $ = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const $$ = <T extends Element = HTMLElement>(s: string) => [...el.querySelectorAll(s)] as T[];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const anim = !reduce;
    const off: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(t: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      window.addEventListener(t, fn, opts);
      off.push(() => window.removeEventListener(t, fn));
    };
    el.classList.toggle('motion', anim);
    el.classList.remove('no-gl');
    el.dataset.ground = 'paper';

    // Smooth scrolling on GSAP's clock, for this page only.
    let lenis: Lenis | null = null;
    const tick = (t: number) => lenis?.raf(t * 1000);
    if (anim) {
      lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      lenisRef.current = lenis;
    }

    // Ground colour and the section index in the nav.
    const grounds = $$('[data-ground]');
    let gIdx = -1;
    const updateGround = () => {
      let i = 0;
      grounds.forEach((s, k) => { if (s.getBoundingClientRect().top <= innerHeight * 0.5) i = k; });
      if (i === gIdx) return;
      gIdx = i;
      el.dataset.ground = grounds[i].dataset.ground;
      setSection({ n: i + 1, label: grounds[i].dataset.label ?? '' });
    };
    on('scroll', updateGround, { passive: true });
    updateGround();

    // Custom cursor and the magnetic join button.
    const cursor = $('.cursor'), cLab = $('.cursor b');
    let cRaf = 0;
    if (fine && anim) {
      let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
      on('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
      const loop = () => { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cursor.style.transform = `translate(${cx}px,${cy}px)`; cRaf = requestAnimationFrame(loop); };
      loop();
      const over = (e: PointerEvent) => {
        const t = e.target as Element;
        const z = t.closest<HTMLElement>('[data-cursor]'), l = t.closest('a, button, .seg');
        cursor.classList.toggle('big', !!z && !l);
        cursor.classList.toggle('link', !!l);
        if (z) cLab.textContent = z.dataset.cursor ?? '';
      };
      document.addEventListener('pointerover', over);
      off.push(() => document.removeEventListener('pointerover', over));
      $$('.magnetic').forEach((b) => {
        const move = (e: PointerEvent) => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', (e.clientX - r.left - r.width / 2) * 0.25 + 'px'); b.style.setProperty('--my', (e.clientY - r.top - r.height / 2) * 0.25 + 'px'); };
        const leave = () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); };
        b.addEventListener('pointermove', move);
        b.addEventListener('pointerleave', leave);
        off.push(() => { b.removeEventListener('pointermove', move); b.removeEventListener('pointerleave', leave); });
      });
    }

    // ── Opening ──
    const stageEl = $('.stage'), leaf = $('.leaf'), canvas = $<HTMLCanvasElement>('#gl');
    const gecko = new GeckoScene($<HTMLCanvasElement>('.leaf canvas'), { plate: '/img/home/leaf-plate.jpg', photo: '/img/gecko-hero.jpg', atlas: '/img/home/gecko-parts.png' });
    // Size the leaf like object-fit: cover, keeping the gecko in frame on narrow screens.
    const fitLeaf = () => {
      const w = stageEl.clientWidth, h = stageEl.clientHeight, ar = PHOTO.w / PHOTO.h;
      let lw = w, lh = w / ar;
      if (lh < h) { lh = h; lw = h * ar; }
      const focus = w < 760 ? 0.7 : 0.6;
      const left = clamp(w / 2 - lw * focus, w - lw, 0);
      Object.assign(leaf.style, { width: lw + 'px', height: lh + 'px', left: left + 'px', top: (h - lh) / 2 + 'px' });
      gecko.resize();
    };
    fitLeaf();
    on('resize', fitLeaf);

    let bloom: Bloom | null = null;
    if (anim) {
      bloom = new Bloom(canvas, () => el.classList.add('no-gl'));
      on('pointermove', (e) => { if (bloom) { bloom.mx = e.clientX / innerWidth; bloom.my = 1 - e.clientY / innerHeight; } }, { passive: true });
      on('resize', () => bloom?.resize());
    } else {
      el.classList.add('no-gl');
    }

    const ctx = gsap.context(() => {
      const lines = ['#ln1', '#ln2', '#ln3'].map((s) => $(s));
      const centreOffset = (l: HTMLElement) => {
        const p = l.parentElement!.getBoundingClientRect(), r = l.getBoundingClientRect();
        return (p.width - r.width) / 2 - (r.left - (gsap.getProperty(l, 'x') as number) - p.left);
      };
      const strips = $$('.odo .strip');
      if (!anim) {
        gecko.set(1);
        strips.forEach((s) => (s.style.transform = `translateY(${(-100 * +s.dataset.n!) / (+s.dataset.n! + 1)}%)`));
        setNavOn(true);
      } else {
        const walk = { p: 0 };
        gsap.set('.stat .k, #statLine, #statSub, .odo', { autoAlpha: 0 });
        gsap.set('#ln1 > span, #ln2 > span, #ln3 > span', { yPercent: 115, autoAlpha: 0 });
        gsap.set('.gridlines', { autoAlpha: 0 });
        gecko.set(0);
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: '.opening', start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true,
            onUpdate: (s) => {
              if (bloom) bloom.on = s.progress < 0.26;
              canvas.style.visibility = s.progress < 0.26 ? 'visible' : 'hidden';
              setNavOn(s.progress > 0.7);
            },
          },
        });
        // a. the name, then the O blooms onto the leaf
        tl.to('.stage .corner', { autoAlpha: 0, y: -10, duration: 0.05, stagger: 0.008 }, 0.02)
          .to(bloom ?? {}, { bloom: 1, duration: 0.2, ease: 'power1.in' }, 0.03)
          // without WebGL the plain wordmark fades instead
          .to('.fallback', { autoAlpha: 0, duration: 0.12 }, 0.06)
          .fromTo(leaf, { scale: 1.18 }, { scale: 1, duration: 0.3, ease: 'power2.out' }, 0.05)
          // b. the gecko walks in and settles into the photo's pose
          .to(walk, { p: 1, duration: 0.23, onUpdate: () => gecko.set(walk.p) }, 0.21)
          // c. the problem lands: 1.5B rolls in over the leaf
          .to('.shade', { opacity: 1, duration: 0.06 }, 0.445)
          .to('.stat .k', { autoAlpha: 1, duration: 0.03 }, 0.465)
          .to('.odo', { autoAlpha: 1, duration: 0.02 }, 0.475);
        strips.forEach((s, k) => tl.fromTo(s, { yPercent: 0 }, { yPercent: () => (-100 * +s.dataset.n!) / (+s.dataset.n! + 1), duration: 0.1, ease: 'power3.out' }, 0.475 + k * 0.015));
        tl.fromTo('#statLine', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.04, ease: 'power3.out' }, 0.555)
          .fromTo('#statSub', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.04, ease: 'power3.out' }, 0.585)
          // d. paper slides over, the grid opens and the statement lands
          .to('.sheet', { clipPath: 'inset(0% 0 0 0)', duration: 0.07, ease: 'power3.inOut' }, 0.67)
          .to(leaf, { y: () => -innerHeight * 0.2, duration: 0.07, ease: 'power3.inOut' }, 0.67)
          .to('#ln1 > span, #ln2 > span, #ln3 > span', { yPercent: 0, autoAlpha: 1, duration: 0.07, stagger: 0.012, ease: 'power3.out' }, 0.73)
          .fromTo(lines, { x: (_i: number, l: HTMLElement) => centreOffset(l) }, { x: 0, duration: 0.1, ease: 'power2.inOut' }, 0.85)
          .to('.gridlines', { autoAlpha: 1, duration: 0.05 }, 0.86)
          .fromTo('.gridlines .cols i', { scaleY: 0, transformOrigin: 'top' }, { scaleY: 1, duration: 0.08, stagger: 0.004 }, 0.85);
        gsap.from(canvas, { autoAlpha: 0, duration: 1.4, ease: 'power2.out' });

        // ── Type and reveal animations ──
        $$('.split').forEach((s) => gsap.from(s.querySelectorAll('.w > span'), { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.035, scrollTrigger: { trigger: s, start: 'top 85%' } }));
        $$('.rise').forEach((r) => gsap.to(r, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: r, start: 'top 90%' } }));
        $$('.vs-row .old').forEach((o) => gsap.to(o, { '--s': 1, duration: 0.9, ease: 'power3.inOut', scrollTrigger: { trigger: o, start: 'top 78%' } }));
        $$('.vs-row .new').forEach((n) => gsap.from(n, { x: -24, autoAlpha: 0, duration: 1, delay: 0.25, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 78%' } }));
      }

      // ── The problem chart draws as you scroll ──
      const saw = $<SVGPathElement>('#saw'), ek = $<SVGPathElement>('#ek'), sawL = saw.getTotalLength(), ekL = ek.getTotalLength(), tags = $$<SVGGElement>('.chart .tag');
      saw.style.strokeDasharray = String(sawL);
      ek.style.strokeDasharray = String(ekL);
      const drawChart = (p: number) => {
        saw.style.strokeDashoffset = String(sawL * (1 - clamp(p / 0.55)));
        ek.style.strokeDashoffset = String(ekL * (1 - clamp((p - 0.55) / 0.38)));
        tags.forEach((g) => g.classList.toggle('dim', p < +(g.dataset.at ?? 0)));
      };
      if (anim) ScrollTrigger.create({ trigger: '.problem-scroll', start: 'top top', end: 'bottom bottom', onUpdate: (s) => drawChart(s.progress) });
      drawChart(anim ? 0 : 1);

      // ── Framework wheel: drag to turn, snap to a stage ──
      const rot = $<SVGGElement>('#wheelRot'), wheelEl = $<SVGSVGElement>('.wheel');
      const norm = (i: number) => ((i % 6) + 6) % 6;
      let angle = 0, active = -1, dragMoved = false, dragging = false, lastA = 0, vel = 0;
      const apply = () => {
        rot.setAttribute('transform', `rotate(${angle})`);
        const i = norm(Math.round(-angle / 60));
        if (i !== active) { active = i; setStage(i); }
      };
      const tweenAngle = (target: number) => {
        if (!anim) { angle = target; apply(); return; }
        const o = { a: angle };
        gsap.to(o, { a: target, duration: 0.9, ease: 'power3.out', onUpdate: () => { angle = o.a; apply(); } });
      };
      wheel.current = {
        turnTo: (i) => { let target = -i * 60; target += Math.round((angle - target) / 360) * 360; tweenAngle(target); },
        step: (d) => tweenAngle(Math.round(angle / 60) * 60 - d * 60),
        moved: () => dragMoved,
      };
      apply();
      const angAt = (e: PointerEvent) => { const r = wheelEl.getBoundingClientRect(); return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI; };
      const down = (e: PointerEvent) => { dragging = true; dragMoved = false; lastA = angAt(e); vel = 0; };
      wheelEl.addEventListener('pointerdown', down);
      off.push(() => wheelEl.removeEventListener('pointerdown', down));
      on('pointermove', (e) => {
        if (!dragging) return;
        const a = angAt(e);
        let d = a - lastA;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        if (Math.abs(d) > 0.5) dragMoved = true;
        angle += d; vel = d; lastA = a;
        apply();
      });
      on('pointerup', () => {
        if (!dragging) return;
        dragging = false;
        if (dragMoved) tweenAngle(Math.round((angle + vel * 6) / 60) * 60);
        setTimeout(() => (dragMoved = false), 0);
      });
      if (anim) gsap.from(rot, { rotation: -120, svgOrigin: '0 0', duration: 1.8, ease: 'power4.out', scrollTrigger: { trigger: wheelEl, start: 'top 80%' }, onComplete: () => rot.removeAttribute('style') });

      // ── Methodology: one word per step, pinned while you scroll ──
      const steps = $$('.m-step'), word = $('#mWord'), dotBars = $$('.m-dots b'), mCount = $('#mCount');
      let mActive = -1;
      const setWord = (txt: string, dir: number) => {
        word.innerHTML = txt.split('').map((c) => `<span class="w"><span>${c}</span></span>`).join('') + '<span class="w"><span style="color:var(--acc)">.</span></span>';
        if (anim) gsap.from(word.querySelectorAll('.w > span'), { yPercent: dir >= 0 ? 110 : -110, duration: 0.8, stagger: 0.025, ease: 'power4.out' });
      };
      const setStep = (i: number) => {
        if (i === mActive) return;
        const dir = i - mActive;
        mActive = i;
        steps.forEach((s, k) => { const isOn = k === i; s.classList.toggle('on', isOn); if (anim) gsap.to(s, { autoAlpha: isOn ? 1 : 0, y: isOn ? 0 : k < i ? -30 : 30, duration: 0.6, ease: 'power3.out', overwrite: true }); });
        setWord(steps[i].dataset.word ?? '', dir);
        mCount.innerHTML = pad(i + 1) + '<span> / 06</span>';
      };
      if (anim) {
        ScrollTrigger.create({ trigger: '.method-scroll', start: 'top top', end: 'bottom bottom', onUpdate: (s) => { const p = s.progress * steps.length; setStep(Math.min(steps.length - 1, Math.floor(p))); dotBars.forEach((b, k) => (b.style.transform = `scaleX(${clamp(p - k)})`)); } });
        gsap.fromTo(word, { xPercent: 4 }, { xPercent: -10, ease: 'none', scrollTrigger: { trigger: '.method-scroll', start: 'top top', end: 'bottom bottom', scrub: true } });
        setStep(0);
      } else {
        word.textContent = 'Method.';
        steps.forEach((s) => s.classList.add('on'));
      }

      if (anim) gsap.from('.cat', { y: 40, autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.cats', start: 'top 85%' } });
    }, el);

    const refresh = () => { fitLeaf(); ScrollTrigger.refresh(); };
    on('load', refresh);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      off.forEach((f) => f());
      cancelAnimationFrame(cRaf);
      ctx.revert();
      bloom?.destroy();
      gsap.ticker.remove(tick);
      lenis?.destroy();
      document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-scrolling', 'lenis-stopped');
      lenisRef.current = null;
      wheel.current = null;
    };
  }, []);

  // Records and the ranking load after the first paint; re-measure the pinned sections.
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 50);
    return () => clearTimeout(t);
  }, [data, cats]);

  // Each stage panel eases in.
  useEffect(() => {
    if (!panelRef.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tw = gsap.from(panelRef.current.children, { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out' });
    return () => { tw.revert(); };
  }, [stage]);

  // The full-screen menu pauses scrolling and closes on Escape.
  useEffect(() => {
    if (!menu) return;
    lenisRef.current?.stop();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); lenisRef.current?.start(); };
  }, [menu]);

  const toTop = () => (lenisRef.current ? lenisRef.current.scrollTo(0) : window.scrollTo({ top: 0 }));
  const s = STAGES[stage];
  const auth: ReactNode = <Link to={person ? '/app' : '/signin'} className="signin">{person ? 'Open the app' : 'Sign in'}</Link>;

  return (
    <div className="eh" ref={root}>
      <div className="cursor" aria-hidden="true"><i /><b>Drag</b></div>

      <header className={navOn ? 'nav show' : 'nav'}>
        <div className="wrap">
          <Link className="brand" to="/" onClick={toTop} aria-label="Ekoa home"><EkoaWordmark title="Ekoa" /></Link>
          <span className="idx mono" aria-live="polite"><b>{pad(section.n)}</b><span>{section.label}</span></span>
          <ul className="mono">
            {NAV.map((n) => <li key={n.to}><Link to={n.to}>{n.label}</Link></li>)}
            <li>{auth}</li>
            <li><Link className="pill" to="/join">Join the founding cohort</Link></li>
          </ul>
          <button className="menu-btn mono" aria-expanded={menu} aria-controls="eh-menu" onClick={() => setMenu(true)}>Menu</button>
        </div>
      </header>

      <div className={menu ? 'menu open' : 'menu'} id="eh-menu" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="menu-top">
          <EkoaWordmark className="h-5 w-auto" />
          <button className="mono" onClick={() => setMenu(false)}>Close</button>
        </div>
        <nav className="heavy" aria-label="Main">
          {NAV.map((n) => <Link key={n.to} to={n.to}>{n.label}</Link>)}
        </nav>
        <div className="menu-foot mono">
          <Link to={person ? '/app' : '/signin'}>{person ? 'Open the app' : 'Sign in'}</Link>
          <Link className="pill" to="/join" style={{ width: 'fit-content' }}>Join the founding cohort</Link>
          <a href={`mailto:${config.contactEmail}`} style={{ opacity: 0.6 }}>{config.contactEmail}</a>
        </div>
      </div>

      {/* ═════════ 01 · Opening ═════════ */}
      <section className="opening" data-ground="paper" data-label="Opening">
        <div className="stage">
          <div className="leaf" aria-hidden="true"><canvas /></div>
          <div className="shade" />
          <canvas id="gl" aria-hidden="true" />
          <div className="fallback"><EkoaWordmark title="Ekoa" /></div>
          <h1 className="sr">Ekoa: from enthusiasm to lasting action</h1>

          <span className="corner tl mono">Scroll top</span>
          <span className="corner tr mono">Building the founding cohort</span>
          <span className="corner bl mono">Education · Knowledge transfer · Outcomes · Adoption</span>
          <span className="corner br mono"><i />Scroll down</span>

          <div className="stat">
            <div className="wrap">
              <span className="k mono">The problem</span>
              <div className="odo heavy" aria-label="1.5 billion">
                <Strip to={1} />
                <span className="fix">.</span>
                <Strip to={5} />
                <span className="fix b">B</span>
              </div>
              <p className="line it" id="statLine">students attend school.</p>
              <p className="sub" id="statSub">Without a system, a project launches, its leaders graduate, and the school resets to zero.</p>
            </div>
          </div>

          <div className="sheet" aria-hidden="true">
            <div className="gridlines">
              <div className="cols wrap grid12" style={{ height: '100%' }}>{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
              <div className="row" style={{ top: '22%' }} /><div className="row" style={{ top: '78%' }} />
              <span className="gl-lab a mono">Stage 01 · Identify</span>
              <span className="gl-lab b mono">Stage 06 · Scale</span>
              <span className="gl-lab c mono">The implementation network for student-led school sustainability</span>
              <span className="gl-lab d mono">12 col · 6 stages · 1 record</span>
            </div>
            <div className="statement">
              <div className="wrap">
                <p className="heavy">
                  <span className="ln" id="ln1"><span>From</span> <span>enthusiasm</span></span>
                  <span className="ln" id="ln2"><span>to</span> <span className="it">lasting</span></span>
                  <span className="ln" id="ln3"><span>action<b className="dot">.</b></span></span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════ 02 · The problem ═════════ */}
      <section id="problem" data-ground="paper" data-label="The problem">
        <div className="problem-scroll">
          <div className="problem-pin">
            <div className="wrap grid12 problem-grid">
              <div className="problem-copy">
                <span className="marker mono">02 / The problem</span>
                <h2 className="serif split"><W t="The world has passionate students. It’s missing" /> <em className="it"><W t="coordinated execution." /></em></h2>
                <p className="rise">Every year a new team starts a project with real energy. Then exams arrive, leaders graduate, and nothing is written down. The next team starts again from a blank page.</p>
              </div>
              <figure className="chart-wrap">
                <svg className="chart" viewBox="0 0 640 380" role="img" aria-labelledby="chartT">
                  <title id="chartT">Diagram: without a system, progress climbs each year and falls back to zero at graduation. With a shared record, each year starts where the last one ended.</title>
                  <line className="grid" x1="40" y1="120" x2="630" y2="120" /><line className="grid" x1="40" y1="220" x2="630" y2="220" />
                  <line className="grid" x1="236" y1="40" x2="236" y2="320" /><line className="grid" x1="432" y1="40" x2="432" y2="320" />
                  <path className="axis" d="M40 30 V320 H630" />
                  <path className="saw" id="saw" d="M40 320 C90 300 150 230 226 168 L236 160 L236 320 C286 300 346 230 422 168 L432 160 L432 320 C482 300 542 230 618 168 L628 160 L628 320" />
                  <path className="ek" id="ek" d="M40 320 C100 296 170 230 236 196 C260 190 268 192 284 184 C340 154 390 130 432 116 C456 110 466 112 482 104 C540 80 590 62 628 52" />
                  <g className="tag" data-at=".04"><circle className="dot" cx="40" cy="320" r="4" /><text x="48" y="344">Project launch</text></g>
                  <g className="tag" data-at=".2"><circle className="dot" cx="236" cy="160" r="4" /><text x="180" y="146">Graduation</text></g>
                  <g className="tag" data-at=".28"><text x="244" y="312">Reset to zero</text></g>
                  <g className="tag" data-at=".9"><text className="ektxt" x="628" y="36" textAnchor="end">Each year starts from the last record</text></g>
                  <text x="138" y="368" textAnchor="middle">Year 1</text><text x="334" y="368" textAnchor="middle">Year 2</text><text x="530" y="368" textAnchor="middle">Year 3</text>
                </svg>
                <figcaption className="chart-cap mono"><span className="legend"><span><i />Without a system</span><span className="e"><i />With Ekoa</span></span><span>Diagram, not data</span></figcaption>
              </figure>
            </div>
          </div>
        </div>
        <div className="wrap">
          <div className="issues">
            {PROBLEMS.map(([k, t, b]) => (
              <article key={k} className="issue grid12 rise"><span className="mono">{k}</span><h3 className="heavy">{t}</h3><p>{b}</p></article>
            ))}
          </div>
          <div className="versus grid12">
            <h2 className="heavy split"><W t="A global implementation network," /> <span className="it"><W t="built by students for students." /></span></h2>
            <div className="vs-row mono mute" style={{ border: 0, paddingBottom: 4 }}><span>Traditional eco clubs</span><span>Ekoa</span></div>
            {COMPARISON.map(([a, b]) => (
              <div key={a} className="vs-row"><span className="old">{a}</span><span className="new heavy">{b}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ 03 · What Ekoa means ═════════ */}
      <section className="sec" id="meaning" data-ground="moss" data-label="What Ekoa means">
        <div className="wrap">
          <div className="sec-tag mono"><span>03 — What Ekoa means</span><span>Select a letter</span></div>
          <div className="grid12 sec-head">
            <h2 className="heavy split"><W t="Four letters," /> <span className="it"><W t="four jobs." /></span></h2>
            <p className="rise">Each part of the name is something the platform does for a school.</p>
          </div>
          <div className="letters">
            {EKOA_LETTERS.map((d, i) => (
              <button key={d.letter} className={i === letter ? 'letter open' : 'letter'} aria-expanded={i === letter} onClick={() => setLetter(i)}>
                <span className="top mono"><span>{d.letter} —</span><span>{pad(i + 1)}/04</span></span>
                <span className="body"><h3>{d.word}</h3><p className="line">{d.line}</p><p className="plat">{d.platform}</p></span>
                <span className="glyph" aria-hidden="true">{d.letter}</span>
                <span className="word mono">{d.word}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ 04 · The framework ═════════ */}
      <section className="sec" id="framework" data-ground="deep" data-label="The framework">
        <div className="wrap">
          <div className="sec-tag mono"><span>04 — The framework</span><span>The Ekoa cycle</span></div>
          <div className="grid12 sec-head">
            <h2 className="heavy split"><W t="Six stages. Each one leaves something" /> <span className="it"><W t="the next school can use." /></span></h2>
            <p className="rise">A stage only closes when its evidence is in place and the right person signs it off. Turn the wheel, tap a stage, or use the arrow keys.</p>
          </div>
          <div className="grid12 fw-body">
            <div
              className="wheel-wrap"
              data-cursor="Turn"
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); wheel.current?.step(1); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); wheel.current?.step(-1); }
              }}
            >
              <div className="pointer mono" aria-hidden="true"><span>Now</span><i /></div>
              <svg className="wheel" viewBox="-320 -320 640 640" role="group" aria-label="The six-stage Ekoa cycle. Use left and right arrow keys to turn.">
                <g id="wheelRot">
                  <g className="ticks">{TICKS.map((t, i) => <line key={i} {...t} />)}</g>
                  <g>
                    {SEGMENTS.map((g, i) => (
                      <g
                        key={g.name}
                        className={i === stage ? 'seg on' : 'seg'}
                        tabIndex={0}
                        role="button"
                        aria-label={`Stage ${i + 1}: ${g.name}`}
                        onClick={() => { if (!wheel.current?.moved()) wheel.current?.turnTo(i); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wheel.current?.turnTo(i); } }}
                      >
                        <path d={g.d} />
                        <text x={g.tx} y={g.ty} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${g.rot} ${g.tx} ${g.ty})`}>{g.name}</text>
                        <text className="num" x={g.nx} y={g.ny} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${g.rot} ${g.nx} ${g.ny})`}>{pad(i + 1)}</text>
                      </g>
                    ))}
                  </g>
                </g>
                <circle className="core" r="150" />
                <foreignObject x="-44" y="-62" width="88" height="90" style={{ color: 'var(--t)' }}><EkoaMark className="h-full w-full" /></foreignObject>
                <text x="0" y="62" textAnchor="middle" style={{ font: '500 11px var(--mono)', letterSpacing: '.16em', fill: 'var(--t2)' }}>EKOA CYCLE</text>
              </svg>
              <p className="wheel-hint mono">Drag to turn ↻</p>
            </div>
            <div className="fw-panel" ref={panelRef} aria-live="polite">
              <div className="k mono"><span>Stage {pad(stage + 1)} / 06</span><span>Gate · {s.gate.length} check{s.gate.length > 1 ? 's' : ''}</span></div>
              <h3 className="heavy">{s.name}</h3>
              <p className="does">{s.does}.</p>
              <div className="leaves"><span className="mono mute">Leaves behind</span><b>{s.captures}</b></div>
              <ol className="gate">{s.gate.map((g, k) => <li key={g.key} data-n={pad(k + 1)}>{g.label}</li>)}</ol>
              <div className="sign mono"><span>Signed off by</span><b>{signer(s)}</b></div>
              <div className="fw-controls mono">
                <button aria-label="Previous stage" onClick={() => wheel.current?.step(-1)}>← Prev</button>
                <button aria-label="Next stage" onClick={() => wheel.current?.step(1)}>Next →</button>
                <Link to="/how-it-works" className="more" style={{ marginLeft: 'auto', alignSelf: 'center' }}>How the gates work →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════ 05 · Methodology ═════════ */}
      <section id="method" data-ground="forest" data-label="Methodology">
        <div className="method-scroll">
          <div className="method-pin wrap">
            <div className="sec-tag mono"><span>05 — Methodology</span><span>How a project moves</span></div>
            <div className="m-stage">
              <div className="m-word heavy" id="mWord" aria-hidden="true" />
              <div className="m-steps">
                {METHOD.map((m) => (
                  <div key={m.word} className="m-step" data-word={m.word}>
                    <p className="t">{m.t}</p>
                    <p>{m.p}</p>
                    <ul className="facts">
                      {m.facts.map(([a, b, key], k) => <li key={k} className={key ? 'key' : undefined}><span>{a}</span><span>{b}</span></li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="m-foot">
              <div className="m-dots">{METHOD.map((m) => <i key={m.word}><b /></i>)}</div>
              <span className="m-count" id="mCount">01<span> / 06</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════ 06 · Applications ═════════ */}
      <section className="sec" id="apps" data-ground="paper" data-label="Applications">
        <div className="wrap">
          <div className="sec-tag mono"><span>06 — Applications</span><span>Library categories</span></div>
          <div className="grid12 sec-head">
            <h2 className="heavy split"><W t="Where schools" /> <span className="it"><W t="put it to work." /></span></h2>
            <p className="rise">Every record is filed under a category, measured with the same metric library, and can start from a ready-made template. Open a category.</p>
          </div>
          <div className="cats">
            {CATS.map((c, i) => {
              const open = cats.has(i);
              const [first, second] = c.name.split(' & ');
              return (
                <div key={c.name} className={open ? 'cat open' : 'cat'}>
                  <button
                    className="cat-btn"
                    aria-expanded={open}
                    onClick={() => setCats((prev) => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                  >
                    <span className="mono mute">{pad(i + 1)}</span>
                    <span className="heavy">{second ? <>{first} <span className="it">&amp;</span> {second}</> : c.name}</span>
                    <span className="plus" aria-hidden="true">+</span>
                  </button>
                  <div className="cat-body">
                    <div>
                      <div className="grid12 cat-inner">
                        {c.metrics.length > 0 && (
                          <div className="col"><span className="mono">Metric library</span><ul>{c.metrics.map((m) => <li key={m.code}><span>{m.name}</span><span>{m.unit}</span></li>)}</ul></div>
                        )}
                        {c.templates.length > 0 && (
                          <div className="col"><span className="mono">Project templates</span><ul>{c.templates.map((t) => <li key={t.key}><span>{t.name}</span><span>Template</span></li>)}</ul></div>
                        )}
                        {c.note && <div className="col"><span className="mono">In the platform</span><p>{c.note}</p></div>}
                        {!c.metrics.length && !c.templates.length && !c.note && (
                          <div className="col"><span className="mono">In the library</span><p>Records in this category are filed and searchable in the Implementation Library.</p></div>
                        )}
                        <div className="col"><span className="mono">Browse</span><Link to="/library" className="more">Open the Implementation Library →</Link></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═════════ 07 · Proof: peer audit, ranking and the record, live ═════════ */}
      <section className="sec" id="proof" data-ground="moss" data-label="Checked and ranked">
        <div className="wrap">
          <div className="sec-tag mono"><span>07 — Checked and ranked</span><span>Live from the record</span></div>
          <div className="grid12 sec-head">
            <h2 className="heavy split"><W t="Checked by peers," /> <span className="it"><W t="ranked on verified impact." /></span></h2>
          </div>
          <div className="grid12 proof-grid">
            <div className="audit rise">
              <p className="t">Checked by peers, not by the school itself.</p>
              <p>A result reaches tier T3 only after an Ekoa audit school checks the raw numbers and evidence against the protocol: <strong>Shiv Nadar School, Faridabad</strong> or <strong>Green School, Bali</strong>. No school ever audits its own work.</p>
              <Link to="/how-it-works#peer-audit" className="more mono">How peer audit works →</Link>
            </div>
            <div className="rank rise">
              <p className="mono mute" style={{ marginBottom: 14 }}>Schools climb by publishing checked results and building models others adapt. Sign-ups don’t count.</p>
              <ol>
                {(data?.ranking ?? []).slice(0, 3).map((r) => (
                  <li key={r.org_id}><span className="pos heavy">{r.position}</span><span className="nm">{r.name}</span><span className="pts mono">{Math.round(r.score)} pts</span></li>
                ))}
                {data && data.ranking.length === 0 && <li className="empty mono">The first ranking appears once records are verified.</li>}
                {!data && <li className="empty mono">Loading the ranking…</li>}
              </ol>
              <Link to="/ranking" className="more mono" style={{ marginTop: 22 }}>See the full ranking →</Link>
            </div>
          </div>
          <div className="grid12 records">
            <div className="records-head">
              <h3 className="heavy">The record <span className="it">is the result.</span></h3>
              <p>{data ? `${schools.length} schools in ${countries} countries have published ${records.length} records. ${failures} of them did not fully work, and say so.` : 'Loading the latest records.'}</p>
              <Link to="/library" className="more mono">Browse every record →</Link>
            </div>
            <div className="records-list">
              {failed && <RecordTag r={failed} href={`/library/${failed.id}`} compact schoolName={orgName(failed.org_id)} />}
              {others.map((r) => <RecordTag key={r.id} r={r} href={`/library/${r.id}`} compact schoolName={orgName(r.org_id)} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ═════════ 08 · Join ═════════ */}
      <section id="join" data-ground="canopy" data-label="Join">
        <div className="wrap already">
          <div className="sec-tag mono"><span>08 — Join us</span><span>Building the founding cohort</span></div>
          <ul style={{ marginTop: 'clamp(40px,8vh,90px)' }}>
            <li className="rise">The world already has passionate students.</li>
            <li className="rise">It already has eco clubs.</li>
            <li className="rise">It already has ideas.</li>
          </ul>
          <p className="missing heavy split"><W t="What’s missing is" /> <span className="it"><W t="coordinated execution." /></span></p>
        </div>
        <div className="wrap join">
          <div className="grid12 join-grid">
            <h2 className="serif split"><W t="We’re forming the" /> <em className="it"><W t="founding cohort." /></em></h2>
            <div className="join-copy rise">
              <p>This is not a top-down initiative. It is being shaped, tested and grown by the schools, educators, coordinators and youth organisations who join first.</p>
              <p><strong>No sustainability head? One teacher and one student are enough to start.</strong></p>
            </div>
            <ul className="who">
              {AUDIENCE.map(([a, b]) => <li key={a} className="rise">{a} <span className="mono">{b}</span></li>)}
            </ul>
            <div className="apply">
              <Link className="circle magnetic" to="/join">Apply to join <span className="arr">→</span></Link>
              <div className="alt"><span className="mono">Or write to us</span><a href={`mailto:${config.contactEmail}`}><b>{config.contactEmail}</b></a></div>
            </div>
          </div>
        </div>
        <div className="loop">
          <span className="corner tl mono">Ekoa</span>
          <button className="corner br mono" onClick={toTop}>Scroll top ↑</button>
          <EkoaWordmark title="Ekoa" />
        </div>
      </section>
    </div>
  );
}


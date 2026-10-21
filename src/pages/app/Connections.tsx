import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, CircleDot, ExternalLink, FileText, Globe2, HandHelping, LocateFixed, Users, type LucideProps } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/hooks';
import { buildGraph, edgeLabel, KIND_META, neighbourhood, radialLayout, type NodeKind } from '@/lib/connections';
import { initials } from '@/lib/format';
import { Loading, PageHeader, cx } from '@/components/ui';

const STYLE: Record<NodeKind, { fill: string; stroke: string; ink: string; r: number; icon?: ComponentType<LucideProps>; swatch: string }> = {
  school: { fill: '#4E5D46', stroke: '#36412F', ink: '#F8F5EE', r: 24, icon: Building2, swatch: 'bg-moss' },
  country: { fill: '#E9EBDD', stroke: '#768156', ink: '#4A5730', r: 20, icon: Globe2, swatch: 'bg-sage' },
  circle: { fill: '#FBF3EC', stroke: '#CC7A4E', ink: '#8C4726', r: 20, icon: CircleDot, swatch: 'bg-clay' },
  hub: { fill: '#EFEADF', stroke: '#464B3D', ink: '#1E231B', r: 20, icon: Users, swatch: 'bg-ink-soft' },
  partner: { fill: '#CC7A4E', stroke: '#8C4726', ink: '#1E231B', r: 21, icon: HandHelping, swatch: 'bg-clay-600' },
  project: { fill: '#FDFBF7', stroke: '#5B6A3A', ink: '#4A5730', r: 17, icon: FileText, swatch: 'bg-leaf' },
  person: { fill: '#FDFBF7', stroke: '#4E5D46', ink: '#1E231B', r: 17, swatch: 'bg-white border border-moss' },
};
const ALL: NodeKind[] = ['country', 'school', 'circle', 'hub', 'partner', 'project', 'person'];
const clip = (s: string, n = 24) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function useWide() {
  const q = '(min-width: 768px)';
  const [wide, setWide] = useState(() => typeof window === 'undefined' || window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function Connections() {
  const auth = useAuth();
  const myOrg = auth.activeOrg?.id ?? null;
  const { data } = useData(async () => {
    const [orgs, cohorts, cohortMembers, circles, circleMembers, myRoles, people, twins, records, adaptations, verifications, threads, posts] = await Promise.all([
      api.listOrgs(), api.listCohorts(), api.listCohortMembers(), api.listCircles(), api.listCircleMembers(),
      myOrg ? api.listRolesForOrg(myOrg) : Promise.resolve([]), api.listPeople(), api.listTwins(), api.listRecords(),
      api.listAdaptations(), api.listVerifications(), api.listThreads(), api.listPosts(),
    ]);
    return buildGraph({ myOrgId: myOrg, orgs, cohorts, cohortMembers, circles, circleMembers, myRoles, people, twins, records, adaptations, verifications, threads, posts });
  }, [myOrg]);

  const home = myOrg ? `o:${myOrg}` : '';
  const [history, setHistory] = useState<string[]>([]);
  const [at, setAt] = useState(0);
  const wide = useWide();
  // On a phone, start without your own team so the picture stays readable; the toggle brings them back.
  const [kinds, setKinds] = useState<Set<NodeKind>>(() => new Set(wide ? ALL : ALL.filter((k) => k !== 'person')));
  const [depth, setDepth] = useState(1);
  const [hover, setHover] = useState<string | null>(null);

  const graph = data;
  const fallback = graph ? (graph.nodes.has(home) ? home : [...graph.nodes.values()].find((n) => n.kind === 'school')?.id ?? '') : '';
  const center = history[at] ?? fallback;
  const go = (id: string) => {
    if (id === center) return;
    const h = [...(history.length ? history.slice(0, at + 1) : [center]), id];
    setHistory(h);
    setAt(h.length - 1);
  };

  const view = useMemo(() => {
    if (!graph || !center || !graph.nodes.has(center)) return null;
    const nb = neighbourhood(graph, center, depth, kinds);
    const pos = radialLayout(nb.level, nb.parent, graph, depth === 1 ? [0, 230] : depth === 2 ? [0, 190, 360] : [0, 170, 320, 460], wide ? 1.6 : 0.8);
    return { ...nb, pos };
  }, [graph, center, depth, kinds, wide]);

  if (!graph) return <Loading />;
  if (!view) return <p className="text-ink-mute">Nothing to show yet.</p>;

  const counts = new Map<NodeKind, number>();
  for (const id of view.level.keys()) if (id !== center) { const k = graph.nodes.get(id)!.kind; counts.set(k, (counts.get(k) ?? 0) + 1); }
  const pts = [...view.pos.values()];
  // Keep text and nodes the same size on screen however far the graph spreads.
  const rawW = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
  const k = Math.max(1, (rawW + 240) / (wide ? 780 : 520));
  const pad = 120 * k;
  const minX = Math.min(...pts.map((p) => p.x)) - pad, maxX = Math.max(...pts.map((p) => p.x)) + pad;
  const minY = Math.min(...pts.map((p) => p.y)) - pad * 0.7, maxY = Math.max(...pts.map((p) => p.y)) + pad * 0.8;
  const c = graph.nodes.get(center)!;
  const direct = graph.edges
    .filter((e) => e.a === center || e.b === center)
    .map((e) => ({ label: edgeLabel(e, center), n: graph.nodes.get(e.a === center ? e.b : e.a)! }))
    .sort((a, b) => ALL.indexOf(a.n.kind) - ALL.indexOf(b.n.kind) || a.n.label.localeCompare(b.n.label));
  const search = [...graph.nodes.values()].filter((n) => n.kind !== 'person' || n.id.startsWith('p:')).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Connections"
        lead="How your school is linked to countries, circles, hubs, partners and the projects other schools adapted. Click anything to put it at the centre."
        actions={
          <div className="flex items-center gap-1.5">
            <button className="rounded-full border border-paper-line bg-white p-2 text-ink-soft hover:border-ink/30 disabled:opacity-40" disabled={at <= 0} onClick={() => setAt(at - 1)} aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>
            <button className="rounded-full border border-paper-line bg-white p-2 text-ink-soft hover:border-ink/30 disabled:opacity-40" disabled={at >= history.length - 1} onClick={() => setAt(at + 1)} aria-label="Forward"><ArrowRight className="h-4 w-4" /></button>
            {home && center !== home && <button className="inline-flex items-center gap-1.5 rounded-full border border-paper-line bg-white px-3 py-1.5 text-sm font-bold hover:border-ink/30" onClick={() => go(home)}><LocateFixed className="h-4 w-4" /> My school</button>}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="order-2 space-y-5 rounded-panel border border-paper-line bg-white p-5 lg:order-1 lg:self-start">
          <fieldset>
            <legend className="label-caps mb-3 text-ink-mute">Show</legend>
            <div className="space-y-1.5">
              {ALL.map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-field px-1.5 py-1 text-sm hover:bg-paper">
                  <input type="checkbox" className="h-4 w-4 accent-moss" checked={kinds.has(k)} onChange={() => { const s = new Set(kinds); if (s.has(k)) s.delete(k); else s.add(k); setKinds(s); }} />
                  <span className={cx('h-3 w-3 shrink-0 rounded-full', STYLE[k].swatch)} aria-hidden />
                  <span className="flex-1 font-bold text-ink">{KIND_META[k].plural}</span>
                  <span className="tabular-nums text-xs text-ink-mute">{counts.get(k) ?? 0}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label-caps mb-2 text-ink-mute">Depth</legend>
            <div className="grid grid-cols-3 gap-1 rounded-full bg-paper-deep p-1">
              {[1, 2, 3].map((d) => (
                <button key={d} onClick={() => setDepth(d)} aria-pressed={depth === d} className={cx('rounded-full py-1 text-sm font-bold', depth === d ? 'bg-white text-ink shadow-sm' : 'text-ink-mute hover:text-ink')}>{d}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-mute">{depth === 1 ? 'Direct connections only.' : `Up to ${depth} steps away.`}</p>
          </fieldset>
          <label className="block">
            <span className="label-caps mb-2 block text-ink-mute">Centre on</span>
            <select className="field-input text-sm" value="" onChange={(e) => e.target.value && go(e.target.value)}>
              <option value="">Find a school, circle or country</option>
              {(['school', 'country', 'circle', 'hub', 'partner', 'project'] as NodeKind[]).map((k) => (
                <optgroup key={k} label={KIND_META[k].plural}>{search.filter((n) => n.kind === k).map((n) => <option key={n.id} value={n.id}>{clip(n.label, 40)}</option>)}</optgroup>
              ))}
            </select>
          </label>
          <p className="text-xs leading-relaxed text-ink-mute">Other schools appear as schools, never as people. Only your own team is shown, and only to you.</p>
        </aside>

        <div className="order-1 min-w-0 space-y-5 lg:order-2">
          <figure className="grain relative overflow-hidden rounded-panel border border-paper-line bg-paper">
            <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className={cx('block w-full', wide ? 'h-[min(70vh,640px)]' : 'h-[520px]')} role="group" aria-label={`Connections of ${c.label}`}>
              {view.edges.map((e) => {
                // Read the edge outward from the node nearer the centre, and put its label nearer the outer end.
                const inner = view.level.get(e.a)! <= view.level.get(e.b)! ? e.a : e.b;
                const outer = inner === e.a ? e.b : e.a;
                const a = view.pos.get(inner)!, b = view.pos.get(outer)!;
                const mx = a.x + (b.x - a.x) * 0.62, my = a.y + (b.y - a.y) * 0.62;
                const lit = hover && (e.a === hover || e.b === hover);
                const text = edgeLabel(e, inner);
                const w = (text.length * 6.4 + 12) * k;
                return (
                  <g key={e.a + e.b + e.label} opacity={hover && !lit ? 0.35 : 1}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={lit ? '#8C4726' : '#BDB6A6'} strokeWidth={(lit ? 2 : 1.4) * k} />
                    <rect x={mx - w / 2} y={my - 9 * k} width={w} height={18 * k} rx={9 * k} fill="#F8F5EE" stroke="#DCD6C8" strokeWidth={k} />
                    <text x={mx} y={my + 4 * k} textAnchor="middle" fontSize={11 * k} fill="#67685A" fontFamily="Karla Variable, Karla, sans-serif">{text}</text>
                  </g>
                );
              })}
              {[...view.pos.entries()].map(([id, p]) => {
                const n = graph.nodes.get(id)!;
                const st = STYLE[n.kind];
                const isC = id === center;
                const r = (isC ? st.r + 12 : st.r) * k;
                const Icon = st.icon;
                return (
                  <g
                    key={id}
                    transform={`translate(${p.x} ${p.y})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${n.label}, ${KIND_META[n.kind].label}${isC ? ', at the centre' : '. Put at the centre'}`}
                    className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-sky"
                    onClick={() => go(id)}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(id); } }}
                    onMouseEnter={() => setHover(id)}
                    onMouseLeave={() => setHover(null)}
                    opacity={hover && hover !== id && !view.edges.some((e) => (e.a === hover && e.b === id) || (e.b === hover && e.a === id)) ? 0.55 : 1}
                  >
                    <circle r={r} fill={st.fill} stroke={st.stroke} strokeWidth={(isC ? 3 : 1.6) * k} strokeDasharray={n.kind === 'person' ? `${3 * k} ${3 * k}` : undefined} />
                    {(n.audit || n.mine) && <circle r={r + 5 * k} fill="none" stroke="#CC7A4E" strokeWidth={2 * k} strokeDasharray={n.audit ? `${4 * k} ${3 * k}` : undefined} />}
                    {Icon ? <Icon x={-r * 0.45} y={-r * 0.45} width={r * 0.9} height={r * 0.9} color={st.ink} strokeWidth={2} aria-hidden /> : (
                      <text y={4 * k} textAnchor="middle" fontSize={11 * k} fontWeight={700} fill={st.ink} fontFamily="Karla Variable, Karla, sans-serif">{initials(n.label)}</text>
                    )}
                    <text y={r + 16 * k} textAnchor="middle" fontSize={(isC ? 15 : 12.5) * k} fontWeight={700} fill="#1E231B" fontFamily="Karla Variable, Karla, sans-serif" paintOrder="stroke" stroke="#F8F5EE" strokeWidth={4 * k}>{clip(n.label, isC ? 34 : 24)}</text>
                    {n.sub && <text y={r + 30 * k} textAnchor="middle" fontSize={10.5 * k} fill="#67685A" fontFamily="Karla Variable, Karla, sans-serif" paintOrder="stroke" stroke="#F8F5EE" strokeWidth={4 * k}>{clip(n.sub, 30)}</text>}
                  </g>
                );
              })}
            </svg>
            <figcaption className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-field bg-white/90 px-3 py-1.5 text-[11px] text-ink-mute">
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-clay" /> Your school</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed border-clay" /> Ekoa audit school</span>
            </figcaption>
          </figure>

          <section className="rounded-panel border border-paper-line bg-white p-5" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="label-caps text-ink-mute">{KIND_META[c.kind].label}{c.audit ? ' · Ekoa audit school' : ''}</p>
                <h2 className="mt-1 text-2xl">{c.label}</h2>
                {c.sub && <p className="text-sm text-ink-mute">{c.sub}</p>}
              </div>
              {c.href && <Link to={c.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-leaf-600 hover:underline">Open <ExternalLink className="h-4 w-4" /></Link>}
            </div>
            <h3 className="label-caps mb-2 mt-5 text-ink-mute">All direct connections ({direct.length})</h3>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {direct.map(({ label, n }) => (
                <li key={n.id + label} className="min-w-0">
                  <button onClick={() => go(n.id)} className="flex w-full items-center gap-2.5 rounded-field border border-paper-line px-3 py-2 text-left text-sm hover:border-ink/30">
                    <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', STYLE[n.kind].swatch)} aria-hidden />
                    <span className="min-w-0 flex-1 truncate"><span className="text-ink-mute">{label}</span> <span className="font-bold">{n.label}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}


import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fmtShort } from '@/lib/format';
import { cx } from './ui';

/** Fixed categorical order, validated for colour-blind separation (dataviz validator, all pairs). */
export const SERIES = ['#3F6B2B', '#E37E3F', '#2C6EC0', '#A0408A'];

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(Math.max(260, e[0].contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

const niceTicks = (lo: number, hi: number, n = 4) => {
  const span = hi - lo || 1;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) ?? mag * 10;
  const start = Math.floor(lo / step) * step;
  const ticks: number[] = [];
  for (let v = start; ; v += step) {
    ticks.push(+v.toFixed(6));
    if (v >= hi - step * 0.001) break;
  }
  return ticks;
};

export interface LinePoint { date: string; value: number; tier?: number; baseline?: boolean }

/** One metric over time, with its baseline and target as reference lines.
 *  Filled markers are verified (T2+); hollow markers are not yet verified. */
export function LineChart({
  points, baseline, target, format, label, color = SERIES[0], height = 220,
}: {
  points: LinePoint[];
  baseline?: number | null;
  target?: number | null;
  format: (v: number) => string;
  label: string;
  color?: string;
  height?: number;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const values = [...points.map((p) => p.value), ...(baseline != null ? [baseline] : []), ...(target != null ? [target] : [])];
  const lo = Math.min(0, ...values);
  const hiRaw = Math.max(...values, 1);
  const ticks = niceTicks(lo, hiRaw * 1.08);
  const hi = ticks[ticks.length - 1];
  const times = points.map((p) => new Date(p.date).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const X = (t: number) => pad.l + ((t - t0) / (t1 - t0 || 1)) * (w - pad.l - pad.r);
  const Y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (height - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(times[i]).toFixed(1)} ${Y(p.value).toFixed(1)}`).join('');
  const xTicks = useMemo(() => {
    if (points.length < 2) return points.map((p) => p.date);
    const n = Math.min(5, points.length);
    return Array.from({ length: n }, (_, i) => points[Math.round((i * (points.length - 1)) / (n - 1))].date);
  }, [points]);

  if (!points.length) return <p className="py-8 text-sm text-ink-mute">No measurements yet. Log the first one to start the chart.</p>;

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const x = e.clientX - rect.left + pad.l;
    let best = 0;
    let dist = Infinity;
    times.forEach((t, i) => {
      const d = Math.abs(X(t) - x);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setHover(best);
  };
  const hp = hover !== null ? points[hover] : null;

  return (
    <figure className="w-full">
      <div ref={ref} className="relative w-full">
        <svg width={w} height={height} role="img" aria-label={label} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke="#DCD6C8" strokeWidth={1} />
              <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={11} fill="#67685A">{format(t)}</text>
            </g>
          ))}
          {xTicks.map((d, i) => (
            <text key={d + i} x={X(new Date(d).getTime())} y={height - 8} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'} fontSize={11} fill="#67685A">
              {fmtShort(d)}
            </text>
          ))}
          {baseline != null && (
            <g>
              <line x1={pad.l} x2={w - pad.r} y1={Y(baseline)} y2={Y(baseline)} stroke="#67685A" strokeWidth={1.25} />
              <text x={w - pad.r} y={Y(baseline) - 5} textAnchor="end" fontSize={11} fill="#464B3D">Baseline {format(baseline)}</text>
            </g>
          )}
          {target != null && (
            <g>
              <line x1={pad.l} x2={w - pad.r} y1={Y(target)} y2={Y(target)} stroke="#8C4726" strokeWidth={1.5} strokeDasharray="5 4" />
              <text x={pad.l + 6} y={Y(target) - 5} textAnchor="start" fontSize={11} fontWeight={700} fill="#8C4726">Target {format(target)}</text>
            </g>
          )}
          <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => {
            const verified = (p.tier ?? 0) >= 2;
            return (
              <circle key={i} cx={X(times[i])} cy={Y(p.value)} r={hover === i ? 6 : 4.5} fill={verified && !p.baseline ? color : '#FDFBF7'} stroke={p.baseline ? '#67685A' : color} strokeWidth={2} />
            );
          })}
          {hp && hover !== null && <line x1={X(times[hover])} x2={X(times[hover])} y1={pad.t} y2={height - pad.b} stroke="#1E231B" strokeOpacity={0.25} />}
          <rect x={pad.l} y={pad.t} width={Math.max(0, w - pad.l - pad.r)} height={height - pad.t - pad.b} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </svg>
        {hp && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 min-w-[9rem] rounded-field border border-paper-line bg-white px-3 py-2 text-xs shadow-md"
            style={{ left: Math.min(w - 150, Math.max(0, X(times[hover]) + 10)), top: Math.max(0, Y(hp.value) - 54) }}
          >
            <p className="font-bold text-ink">{format(hp.value)}</p>
            <p className="text-ink-mute">Week ending {fmtShort(hp.date)}</p>
            <p className="text-ink-mute">{hp.baseline ? 'Baseline' : `Tier ${hp.tier ?? 0}${(hp.tier ?? 0) >= 2 ? ', verified' : ', not yet verified'}`}</p>
          </div>
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-mute">
        <span className="inline-flex items-center gap-1.5"><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill={color} /></svg>Verified (T2 or higher)</span>
        <span className="inline-flex items-center gap-1.5"><svg width="10" height="10"><circle cx="5" cy="5" r="3.5" fill="#FDFBF7" stroke={color} strokeWidth="2" /></svg>Not yet verified</span>
        <details className="ml-auto">
          <summary className="cursor-pointer font-bold text-ink-soft">Show data</summary>
          <table className="mt-2 w-full min-w-[16rem] text-left text-xs">
            <thead><tr className="text-ink-mute"><th className="py-1 pr-4 font-bold">Week ending</th><th className="py-1 pr-4 font-bold">Value</th><th className="py-1 font-bold">Tier</th></tr></thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i} className="border-t border-paper-line"><td className="py-1 pr-4">{fmtShort(p.date)}{p.baseline ? ' (baseline)' : ''}</td><td className="py-1 pr-4 tabular-nums">{format(p.value)}</td><td className="py-1">T{p.tier ?? 0}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </figcaption>
    </figure>
  );
}

export interface BarItem { label: ReactNode; value: number; marker?: number; tone?: 'leaf' | 'clay' | 'lesson' | 'alert' | 'mute'; note?: string }

/** Horizontal bars with direct labels. Optional marker shows a reference value (for example, typical days). */
export function BarList({ items, format = (v) => String(v), max, markerLabel }: { items: BarItem[]; format?: (v: number) => string; max?: number; markerLabel?: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => Math.max(i.value, i.marker ?? 0)));
  const fill = { leaf: 'bg-leaf', clay: 'bg-clay-600', lesson: 'bg-lesson', alert: 'bg-alert', mute: 'bg-ink-mute/60' };
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[minmax(7rem,13rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="leading-snug text-ink-soft">{it.label}</span>
          <span className="relative h-3.5 rounded-r-[4px] bg-paper-deep" title={it.note}>
            <span className={cx('absolute inset-y-0 left-0 rounded-r-[4px]', fill[it.tone ?? 'leaf'])} style={{ width: `${(it.value / top) * 100}%` }} />
            {it.marker !== undefined && (
              <span className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: `calc(${(it.marker / top) * 100}% - 1px)` }} aria-hidden />
            )}
          </span>
          <span className="w-14 text-right font-bold tabular-nums text-ink">{format(it.value)}</span>
        </div>
      ))}
      {markerLabel && (
        <p className="flex items-center gap-2 pt-1 text-xs text-ink-mute">
          <span className="inline-block h-3 w-0.5 bg-ink" aria-hidden /> {markerLabel}
        </p>
      )}
    </div>
  );
}

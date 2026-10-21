import { STAGES } from '@/lib/ekoa';
import type { StageKey } from '@/lib/types';
import { EkoaWordmark } from './EkoaLogo';

const RING = {
  dark: { on: '#5B6A3A', now: '#CC7A4E', dim: 'rgba(30,35,27,0.16)' },
  light: { on: '#C9CFA9', now: '#E8A47C', dim: 'rgba(248,245,238,0.3)' },
};

/** Six arcs, one per Ekoa stage, used as a stage indicator. */
export function StageRing({ size = 28, stage, light = false }: { size?: number; stage?: StageKey; light?: boolean }) {
  const r = 11;
  const c = 14;
  const gap = 9; // degrees between arcs
  const arc = (i: number) => {
    const a0 = ((i * 60 - 90 + gap / 2) * Math.PI) / 180;
    const a1 = (((i + 1) * 60 - 90 - gap / 2) * Math.PI) / 180;
    return `M${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`;
  };
  const idx = stage ? STAGES.findIndex((s) => s.key === stage) : -1;
  const k = light ? RING.light : RING.dark;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      {STAGES.map((s, i) => (
        <path key={s.key} d={arc(i)} fill="none" strokeWidth={3.2} strokeLinecap="round" stroke={idx < 0 ? (i === 0 ? k.now : k.on) : i < idx ? k.on : i === idx ? k.now : k.dim} />
      ))}
      <circle cx={c} cy={c} r={3.2} fill={k.now} />
    </svg>
  );
}

/** The Ekoa logo. Dark on light backgrounds, cream on dark ones. */
export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return <EkoaWordmark className={`${compact ? 'h-6' : 'h-7'} w-auto ${light ? 'text-paper' : 'text-ink'}`} />;
}

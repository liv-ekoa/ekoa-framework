import { Check } from 'lucide-react';
import { STAGES } from '@/lib/ekoa';
import type { StageKey } from '@/lib/types';
import { cx } from './ui';

/** The six stages as a horizontal rail. Clicking a stage selects it. */
export function StageRail({ current, selected, onSelect }: { current: StageKey; selected?: StageKey; onSelect?: (s: StageKey) => void }) {
  const ci = STAGES.findIndex((s) => s.key === current);
  return (
    <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-6" aria-label="Ekoa stages">
      {STAGES.map((s, i) => {
        const done = i < ci;
        const now = i === ci;
        const sel = selected === s.key;
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onSelect?.(s.key)}
              aria-current={now ? 'step' : undefined}
              aria-pressed={sel}
              className={cx(
                'group flex w-full flex-col items-start rounded-field border px-3 py-2 text-left transition-colors',
                sel ? 'border-ink bg-white' : 'border-paper-line bg-paper hover:border-ink/40',
              )}
            >
              <span className="flex w-full items-center justify-between">
                <span className={cx('text-xs font-bold tabular-nums', now ? 'text-clay-700' : done ? 'text-leaf' : 'text-ink-mute')}>{s.n}</span>
                {done && <Check className="h-3.5 w-3.5 text-leaf" aria-label="complete" />}
                {now && <span className="h-2 w-2 rounded-full bg-clay-600" aria-label="current" />}
              </span>
              <span className={cx('font-display text-sm font-semibold', i > ci ? 'text-ink-mute' : 'text-ink')}>{s.name}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

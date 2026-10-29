import { Link } from 'react-router-dom';
import { OUTCOMES, metricByCode } from '@/lib/ekoa';
import { formatMetric } from '@/lib/metrics';
import type { ImplementationRecord } from '@/lib/types';
import { cx } from './ui';

const band: Record<string, string> = {
  worked: 'bg-leaf',
  partly: 'bg-clay-600',
  did_not_work: 'bg-lesson',
  too_early: 'bg-ink-mute',
};

const ISO: Record<string, string> = {
  India: 'IN', Indonesia: 'ID', Singapore: 'SG', Brazil: 'BR', Nepal: 'NP', Kenya: 'KE', Philippines: 'PH', 'South Africa': 'ZA',
  Portugal: 'PT', 'United Kingdom': 'GB', 'United States': 'US', Malaysia: 'MY', Thailand: 'TH', 'Sri Lanka': 'LK', Bangladesh: 'BD',
};

export function catalogue(r: ImplementationRecord) {
  const c = r.context?.country ?? '';
  const country = ISO[c] ?? (c.slice(0, 2).toUpperCase() || 'XX');
  const year = (r.published_at ?? r.created_at).slice(0, 4);
  return `${country}/${year}/${r.id.slice(-4).toUpperCase()}`;
}

/** The record as a field-specimen tag. The signature object of the product. */
export function RecordTag({ r, href, compact = false, showSchool = true, schoolName }: { r: ImplementationRecord; href?: string; compact?: boolean; showSchool?: boolean; schoolName?: string }) {
  const o = OUTCOMES[r.outcome_class];
  const lead = r.outcomes[0];
  const def = lead ? metricByCode(lead.metric_code) : undefined;
  const where = r.anonymised || !schoolName ? r.context?.descriptor : `${schoolName}, ${r.context?.city}`;
  const body = (
    <article className={cx('tag-shape relative flex h-full flex-col bg-white pl-5 pr-6 shadow-[0_1px_0_rgba(20,35,28,0.08)] ring-1 ring-paper-line transition-shadow', href && 'hover:ring-ink/30', compact ? 'py-4' : 'py-5')}>
      <span className={cx('absolute inset-y-0 left-0 w-1.5', band[r.outcome_class])} aria-hidden />
      <span className="tag-hole" aria-hidden />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-10 text-xs text-ink-mute">
        <span className="rounded-tag bg-paper-deep px-2 py-0.5 font-bold text-ink-soft">Project</span>
        <span className="font-bold tabular-nums text-ink-soft">{catalogue(r)}</span>
        <span>{r.category}</span>
        {r.status !== 'published' && <span className="font-bold text-sky">{r.status === 'in_review' ? 'In review' : 'Draft'}</span>}
      </div>
      <h3 className={cx('mt-2 font-display font-semibold leading-snug text-ink', compact ? 'text-base' : 'text-lg')}>{r.title}</h3>
      {showSchool && where && <p className="mt-1 text-sm text-ink-mute">{where}</p>}
      {!compact && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft">{r.summary}</p>}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
        {lead && def ? (
          <div>
            <p className="text-xs text-ink-mute">{def.name}</p>
            <p className="font-display text-xl font-bold tabular-nums text-ink">
              {formatMetric(lead.metric_code, lead.baseline)} <span className="text-ink-mute">to</span> {formatMetric(lead.metric_code, lead.result)}
            </p>
          </div>
        ) : (
          <span />
        )}
        <div className="flex flex-col items-end gap-1">
          <span className={cx('rounded-tag px-2 py-0.5 text-xs font-bold text-white', band[r.outcome_class])}>{o.label}</span>
          <span className="rounded-tag border border-clay-600/50 bg-clay-100 px-2 py-0.5 text-xs font-bold text-clay-700">Tier {r.tier}</span>
        </div>
      </div>
    </article>
  );
  return href ? (
    <Link to={href} className="block h-full rounded-tag focus-visible:outline-offset-4">
      {body}
    </Link>
  ) : (
    body
  );
}

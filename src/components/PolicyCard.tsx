import { ExternalLink } from 'lucide-react';
import type { PolicyEntry } from '@/lib/policyLibrary';
import { cx } from './ui';

/** A published school policy, shown in the Library beside the records. Marked "Policy" so it is not mistaken for a project record. */
export function PolicyCard({ p }: { p: PolicyEntry }) {
  return (
    <article className="tag-shape relative flex h-full flex-col bg-white py-5 pl-5 pr-6 shadow-[0_1px_0_rgba(20,35,28,0.08)] ring-1 ring-paper-line">
      <span className="absolute inset-y-0 left-0 w-1.5 bg-sky" aria-hidden />
      <span className="tag-hole" aria-hidden />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-10 text-xs text-ink-mute">
        <span className="rounded-tag bg-sky-100 px-2 py-0.5 font-bold text-sky">Policy</span>
        <span>{p.topic}</span>
      </div>
      <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-ink">{p.title}</h3>
      <p className="mt-1 text-sm text-ink-mute">{p.school}</p>
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-ink-soft">{p.summary}</p>
      <a href={p.url} target="_blank" rel="noreferrer" className={cx('mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-ink underline-offset-2 hover:underline')}>
        Read the full policy <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </article>
  );
}

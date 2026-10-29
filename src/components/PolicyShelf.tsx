import { ExternalLink } from 'lucide-react';
import { Badge } from './ui';
import { POLICY_LIBRARY } from '@/lib/policyLibrary';

export function PolicyShelf() {
  return (
    <div>
      <p className="max-w-prose text-ink-soft">Policies other schools have published. Read the summary here, then open the full original on the school’s own site.</p>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {POLICY_LIBRARY.map((p) => (
          <li key={p.title} className="flex flex-col rounded-panel border border-paper-line bg-white p-5">
            <div className="flex flex-wrap items-center gap-2"><Badge tone="mute">{p.topic}</Badge><span className="text-xs text-ink-mute">{p.school}</span></div>
            <h3 className="mt-2 font-display text-lg font-semibold">{p.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{p.summary}</p>
            <a href={p.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-moss underline-offset-2 hover:underline">
              Read the full policy <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

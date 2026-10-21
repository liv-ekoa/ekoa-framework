import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { EKOA_LETTERS } from '@/lib/ekoa';
import { cx } from './ui';

/** The four letters of EKOA, each tied to the part of the platform that does it. */
export function EkoaLetters({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  if (compact)
    return (
      <dl className={cx('grid grid-cols-2 gap-x-6 gap-y-2 text-sm', light ? 'text-paper/85' : 'text-ink-soft')}>
        {EKOA_LETTERS.map((l) => (
          <div key={l.letter} className="flex items-baseline gap-2">
            <dt className={cx('font-display text-xl font-semibold italic', light ? 'text-[#E8A47C]' : 'text-clay-700')}>{l.letter}</dt>
            <dd>{l.word}</dd>
          </div>
        ))}
      </dl>
    );
  return (
    <ol className="grid gap-px overflow-hidden rounded-panel border border-paper-line bg-paper-line sm:grid-cols-2 lg:grid-cols-4">
      {EKOA_LETTERS.map((l) => (
        <li key={l.letter} className="flex flex-col bg-white p-6">
          <span className="font-display text-7xl font-semibold italic leading-none text-clay" aria-hidden>{l.letter}</span>
          <h3 className="mt-3 text-2xl"><span className="sr-only">{l.letter}: </span>{l.word}</h3>
          <p className="mt-1 font-bold text-ink">{l.line}</p>
          <p className="mt-3 flex-1 text-sm text-ink-soft">{l.platform}</p>
          <Link to={l.to} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-leaf-600 hover:underline">
            Where it happens <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </li>
      ))}
    </ol>
  );
}

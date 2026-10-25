import { Link } from 'react-router-dom';
import { listSchoolRanking } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { plural } from '@/lib/format';
import { LinkButton, Loading, cx } from '@/components/ui';

export const SCORE_RULES: [string, string][] = [
  ['Each verified record that worked', '10 points'],
  ['Each other school that adapted one of your models', '8 points'],
  ['Each verified record that partly worked', '6 points'],
  ['Each verified record that did not work, with its lessons', '4 points'],
  ['Each adaptation of your model that worked', '4 points'],
  ['Peer-audited (T3) or partner-verified (T4) records', '× 1.5'],
];

export default function Ranking() {
  const { activeOrg } = useAuth();
  const { data, loading } = useData(listSchoolRanking);
  const top = data?.[0]?.score ?? 1;

  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <span className="eyebrow">School ranking</span>
      <h1 className="mt-5 max-w-3xl text-4xl sm:text-5xl">Ranked on verified impact, not on sign-ups.</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">
        A school climbs by publishing results someone has checked, and by building models other schools adapt. Honest failures count too, because their lessons save the next school a term.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
        <section aria-label="Ranking">
          {loading || !data ? <Loading /> : data.length ? (
            <ol className="space-y-3">
              {data.map((r) => {
                const mine = r.org_id === activeOrg?.id;
                return (
                  <li key={r.org_id} className={cx('grid grid-cols-[3.5rem_1fr] items-center gap-4 rounded-panel border bg-white p-5 sm:grid-cols-[4rem_1fr_9rem]', mine ? 'border-clay' : 'border-paper-line')}>
                    <span className={cx('font-display text-4xl font-semibold italic tabular-nums leading-none', r.position <= 3 ? 'text-clay-700' : 'text-ink-mute')} aria-label={`Position ${r.position}`}>{r.position}</span>
                    <div className="min-w-0">
                      <p className="font-display text-xl font-semibold leading-tight">{r.name}{mine && <span className="ml-2 align-middle font-sans text-xs font-bold not-italic text-clay-700">Your school</span>}</p>
                      <p className="text-sm text-ink-mute">{[r.city, r.country].filter(Boolean).join(', ')}</p>
                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                        <span>{plural(r.verified_records, 'verified record')}</span>
                        {r.audited_records > 0 && <span>{r.audited_records} peer-audited</span>}
                        <span>{r.adopting_schools ? `Adapted by ${plural(r.adopting_schools, 'school')}` : 'Not adapted yet'}</span>
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-right font-display text-2xl font-semibold tabular-nums">{Math.round(r.score * 10) / 10}<span className="ml-1 font-sans text-xs font-bold text-ink-mute">pts</span></p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-deep" aria-hidden><div className="h-full rounded-full bg-moss" style={{ width: `${Math.max(4, (r.score / top) * 100)}%` }} /></div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="rounded-panel border border-dashed border-paper-line p-8 text-center text-ink-mute">No school has a verified, published record yet. The first one tops the table.</p>
          )}
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-panel bg-moss p-6 text-paper">
            <h2 className="text-2xl text-paper">How the score works</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              {SCORE_RULES.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-paper/15 pb-2 last:border-0">
                  <dt className="text-paper/85">{k}</dt>
                  <dd className="shrink-0 font-bold tabular-nums text-paper">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-paper/80">Only published, named records at tier T2 or higher count. Sign-ups, posts and unverified numbers never do. Schools that publish anonymously are left out of the table.</p>
          </div>
          <div className="rounded-panel border border-paper-line bg-white p-5 text-sm text-ink-soft">
            <p>Want to climb? Publish a verified record, then ask an Ekoa audit school for a T3 peer audit. <Link to="/how-it-works#peer-audit" className="font-bold text-leaf-600 underline">How peer audit works</Link>.</p>
          </div>
          <LinkButton to="/library" variant="ghost" className="w-full">Read the records behind the ranking</LinkButton>
        </aside>
      </div>
    </div>
  );
}

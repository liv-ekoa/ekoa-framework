import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { getPublishedReport } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';

export default function Reports() {
  // The first cohort report appears once an Ekoa admin publishes it from the app.
  const { data: first } = useData(() => getPublishedReport('pilot-01').catch(() => null));
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Reports</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">Each cohort ends with one published implementation report comparing baselines, outcomes, approval timings, obstacles and continuity across schools.</p>
      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        <li>
          {first ? (
            <Link to="/reports/pilot-01" className="flex h-full gap-4 rounded-panel border border-paper-line bg-white p-6 hover:border-ink/40">
              <FileText className="h-8 w-8 shrink-0 text-leaf" aria-hidden />
              <div>
                <h2 className="text-xl font-semibold">{first.title || 'Ekoa Implementation Report 01'}</h2>
                <p className="mt-1 text-ink-soft">Founding Cohort. Published {fmtDate(first.published_at)} from verified records.</p>
              </div>
            </Link>
          ) : (
            <div className="flex h-full gap-4 rounded-panel border border-dashed border-paper-line p-6 text-ink-mute">
              <FileText className="h-8 w-8 shrink-0" aria-hidden />
              <div>
                <h2 className="text-xl font-semibold text-ink-mute">Ekoa Implementation Report 01</h2>
                <p className="mt-1">The Founding Cohort’s report, built from verified records. Published when the cohort completes.</p>
              </div>
            </div>
          )}
        </li>
      </ul>
    </div>
  );
}

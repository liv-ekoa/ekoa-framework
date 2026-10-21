import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export default function Reports() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Reports</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">Each cohort ends with one published implementation report comparing baselines, outcomes, approval timings, obstacles and continuity across schools.</p>
      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        <li>
          <Link to="/reports/pilot-01" className="flex h-full gap-4 rounded-panel border border-paper-line bg-white p-6 hover:border-ink/40">
            <FileText className="h-8 w-8 shrink-0 text-leaf" aria-hidden />
            <div>
              <h2 className="text-xl font-semibold">Ekoa Implementation Report 01</h2>
              <p className="mt-1 text-ink-soft">Pilot Cohort 1: waste reduction, three schools, six months. Live draft compiled from verified pilot data; final version at the end of the pilot.</p>
            </div>
          </Link>
        </li>
        <li className="flex gap-4 rounded-panel border border-dashed border-paper-line p-6 text-ink-mute">
          <FileText className="h-8 w-8 shrink-0" aria-hidden />
          <div>
            <h2 className="text-xl font-semibold text-ink-mute">Implementation Report 02</h2>
            <p className="mt-1">Cohort 2 adds energy and water. Published when that cohort completes.</p>
          </div>
        </li>
      </ul>
    </div>
  );
}

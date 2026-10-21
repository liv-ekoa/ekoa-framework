import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/hooks';
import { loadSchool } from '@/lib/bundle';
import { metricByCode } from '@/lib/ekoa';
import { seriesFor, formatMetric } from '@/lib/metrics';
import { Logo } from '@/components/Logo';

/** Full-screen corridor view. One slow cross-fade between numbers is the only motion. */
export default function Kiosk() {
  const { orgId } = useParams();
  const auth = useAuth();
  const { data, reload } = useData(() => loadSchool(orgId!), [orgId]);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), 9000);
    const r = setInterval(() => void reload(), 5 * 60_000);
    return () => { clearInterval(t); clearInterval(r); };
  }, [reload]);

  if (!auth.loading && !auth.person) return <div className="flex min-h-screen items-center justify-center bg-moss p-8 text-paper"><p>Sign in on this device to show the corridor screen. <Link to="/signin" className="underline">Sign in</Link></p></div>;
  if (!data) return <div className="min-h-screen bg-moss" />;
  const slides = data.projects
    .filter((p) => p.status === 'active')
    .flatMap((p) => data.targets.filter((t) => t.project_id === p.id).map((t) => ({ p, s: seriesFor(p.id, t.metric_code, data.measurements, data.targets) })))
    .filter((x) => x.s.latest !== null && metricByCode(x.s.code)?.is_impact);
  const cur = slides.length ? slides[i % slides.length] : null;
  const def = cur ? metricByCode(cur.s.code) : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-moss p-8 text-paper sm:p-14">
      <div className="flex items-center justify-between"><Logo light /><p className="text-paper/80">{data.org.name}</p></div>
      {cur && def ? (
        <div key={i} className="flex flex-1 flex-col justify-center motion-safe:animate-[fade_900ms_ease-out]">
          <p className="font-display text-2xl text-paper/85 sm:text-3xl">{cur.p.title}</p>
          <p className="mt-2 font-display text-3xl font-semibold sm:text-5xl">{def.name}</p>
          <p className="mt-6 font-display text-[22vw] font-bold leading-none tabular-nums text-clay sm:text-[14vw]">{formatMetric(cur.s.code, cur.s.latest)}</p>
          <p className="mt-4 text-xl text-paper/80 sm:text-2xl">
            {def.unit}. Started at {formatMetric(cur.s.code, cur.s.baseline)}{cur.s.target !== null ? `, aiming for ${formatMetric(cur.s.code, cur.s.target)}` : ''}. {def.higher_is_better ? 'Higher is better.' : 'Lower is better.'}
          </p>
        </div>
      ) : <div className="flex flex-1 items-center"><p className="text-3xl">Numbers appear here once measurements are logged.</p></div>}
      <p className="text-paper/80">Updated weekly by students. Checked by the faculty liaison.</p>
      <style>{'@keyframes fade{from{opacity:0}to{opacity:1}}'}</style>
    </div>
  );
}

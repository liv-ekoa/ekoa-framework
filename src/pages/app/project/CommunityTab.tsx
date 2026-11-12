import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import type { ProjectBundle } from '@/lib/bundle';
import { RecordTag } from '@/components/RecordTag';
import { Button, ErrorNote, Loading, Notice } from '@/components/ui';

/** Other students and schools working on the same kind of problem. */
export function useCommunity(b: ProjectBundle) {
  const auth = useAuth();
  return useData(async () => {
    const [circles, members, records, orgs] = await Promise.all([api.listCircles(), api.listCircleMembers(), api.listRecords(), api.listOrgs()]);
    const circle = circles.find((c) => c.theme === b.project.category.toLowerCase().split(' ')[0]) ?? null;
    const mine = members.some((m) => m.circle_id === circle?.id && m.person_id === auth.person?.id);
    const count = members.filter((m) => m.circle_id === circle?.id).length;
    const examples = records.filter((r) => r.status === 'published' && r.category === b.project.category && r.id !== b.record?.id).slice(0, 4);
    return { circle, mine, count, examples, orgs };
  }, [b.project.id]);
}

export function CommunityTab({ b }: { b: ProjectBundle }) {
  const auth = useAuth();
  const { data, reload } = useCommunity(b);
  const act = useAction();
  if (!data) return <Loading />;
  const { circle, mine, count, examples, orgs } = data;
  return (
    <div className="space-y-8">
      {circle && (
        <section className="rounded-panel border border-paper-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Users className="mt-1 h-5 w-5 text-leaf-600" aria-hidden />
              <div>
                <h2 className="font-display text-xl font-semibold">{circle.name} circle</h2>
                <p className="text-sm text-ink-soft">{circle.description} {count} {count === 1 ? 'member' : 'members'}.</p>
              </div>
            </div>
            {mine ? <Link to="/app/network" className="rounded-full border border-leaf bg-white px-4 py-2 text-sm font-bold text-leaf-600 hover:bg-leaf-50">Open the circle</Link>
              : <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => { await api.joinCircle(circle.id, auth.person!.id); await reload(); })}>Join the circle</Button>}
          </div>
          <ErrorNote>{act.error}</ErrorNote>
          <p className="mt-3 text-sm text-ink-mute">Ask questions, share what worked and see what other schools are trying. Teachers can read everything, and contact details are blocked.</p>
        </section>
      )}
      <section>
        <h2 className="text-xl font-semibold">How other schools did it</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-soft">Real {b.project.category.toLowerCase()} projects, including what went wrong. Open one to see what a good record looks like, or copy it as a starting point.</p>
        {examples.length ? (
          <div className="mt-4 grid gap-5 md:grid-cols-2">{examples.map((r) => <RecordTag key={r.id} r={r} href={`/app/library/${r.id}`} schoolName={orgs.find((o) => o.id === r.org_id)?.name} />)}</div>
        ) : <div className="mt-4"><Notice tone="leaf">No other {b.project.category.toLowerCase()} records yet. Yours could be the first one other schools copy.</Notice></div>}
        <p className="mt-4 text-sm"><Link to="/app/library" className="font-bold text-leaf-600 hover:underline">Browse the whole Library</Link></p>
      </section>
    </div>
  );
}

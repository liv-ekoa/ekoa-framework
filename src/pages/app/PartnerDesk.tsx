import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { relative } from '@/lib/format';
import { RecordTag } from '@/components/RecordTag';
import { Badge, Button, Empty, ErrorNote, Loading, Notice, PageHeader, Panel, Textarea } from '@/components/ui';

export default function PartnerDesk() {
  const auth = useAuth();
  const myOrg = auth.activeOrg?.id;
  const { data, reload } = useData(async () => {
    const [vs, records, orgs, threads, posts] = await Promise.all([api.listVerifications(), api.listRecords(), api.listOrgs(), api.listThreads(), api.listPosts()]);
    return { vs: vs.filter((v) => v.verifier_org === myOrg), records, orgs, threads: threads.filter((t) => t.kind === 'partner_request'), posts };
  }, [myOrg]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const act = useAction();
  if (!data) return <Loading />;
  const open = data.vs.filter((v) => v.status === 'requested' || v.status === 'in_progress');
  return (
    <div className="space-y-6">
      <PageHeader title="Partner desk" lead="Partners verify outcomes and help in group threads. You never contact students directly." />
      <Notice tone="sky">Verification means checking the school’s raw numbers, log sheets and photos against the protocol. Verify only what the evidence supports; declining with a reason is useful too.</Notice>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Verification requests</h2>
        {open.length ? (
          <div className="space-y-4">
            {open.map((v) => {
              const r = data.records.find((x) => x.id === v.record_id);
              if (!r) return null;
              return (
                <div key={v.id} className="grid gap-5 rounded-panel border border-paper-line bg-white p-5 lg:grid-cols-[320px_1fr]">
                  <RecordTag r={r} href={`/app/library/${r.id}`} compact schoolName={data.orgs.find((o) => o.id === r.org_id)?.name} />
                  <div className="space-y-3">
                    <p className="text-sm text-ink-soft">Requested tier: <strong>T{v.requested_tier}</strong> by {data.orgs.find((o) => o.id === v.requested_by_org)?.name}, {relative(v.created_at)}. {v.notes}</p>
                    <Textarea aria-label="Verification notes" rows={3} placeholder="What you checked and what you found" value={notes[v.id] ?? ''} onChange={(e) => setNotes({ ...notes, [v.id]: e.target.value })} />
                    <div className="flex flex-wrap gap-2">
                      <Button busy={act.busy} onClick={() => act.run(async () => { if (!notes[v.id]?.trim()) throw new Error('Note what you checked.'); await api.completeVerification(v, true, notes[v.id], auth.person!.id); reload(); })}>Verify as T{v.requested_tier}</Button>
                      <Button variant="ghost" busy={act.busy} onClick={() => act.run(async () => { if (!notes[v.id]?.trim()) throw new Error('Give the school a reason.'); await api.completeVerification(v, false, notes[v.id], auth.person!.id); reload(); })}>Decline with reason</Button>
                    </div>
                  </div>
                </div>
              );
            })}
            <ErrorNote>{act.error}</ErrorNote>
          </div>
        ) : <Empty title="No verification requests">Schools request partner verification (T4) from a record’s page.</Empty>}
      </section>
      <Panel title="School requests for help">
        <ul className="space-y-2">
          {data.threads.map((t) => (
            <li key={t.id}><Link to={`/app/network/thread/${t.id}`} className="flex items-center justify-between gap-3 rounded-field border border-paper-line px-4 py-3 hover:border-ink/40"><span><span className="font-bold">{t.title}</span><span className="block text-xs text-ink-mute">{data.orgs.find((o) => o.id === t.org_id)?.name}, {relative(t.created_at)}</span></span><Badge tone={t.status === 'answered' ? 'leaf' : 'clay'}>{t.status}</Badge></Link></li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

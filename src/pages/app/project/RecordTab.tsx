import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import * as api from '@/lib/api';
import { authorMeta, useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { draftRecord } from '@/lib/ai';
import { OUTCOMES, TIERS } from '@/lib/ekoa';
import { fmtDate } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import { RecordTag } from '@/components/RecordTag';
import { Badge, Button, Empty, ErrorNote, LinkButton, Notice, Panel, Select } from '@/components/ui';

export function RecordTab({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const auth = useAuth();
  const nav = useNavigate();
  const act = useAction();
  const isLiaison = auth.has('faculty_liaison', b.project.org_id);
  const { data } = useData(async () => {
    const [circles, orgs, twins, verifs] = await Promise.all([api.listCircles(), api.listOrgs(), api.listTwins(), api.listVerifications()]);
    return { circles, orgs, twins, verifs };
  });
  const [circle, setCircle] = useState('');
  const [verifier, setVerifier] = useState('');

  if (!b.record)
    return (
      <Empty
        title="No record yet"
        action={canEdit ? (
          <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => {
            const d = await draftRecord(b);
            const r = await api.saveRecord({
              ...d, org_id: b.project.org_id, project_id: b.project.id, outcome_class: 'too_early', tier: 0, status: 'draft', visibility: 'school', anonymised: false,
              context: { ...b.org.context_profile!, country: b.org.country, city: b.org.city, descriptor: b.org.anonymised_label ?? '' },
              materials: [], contributors: ['Project Lead', 'Implementation Team', 'Faculty Liaison'],
            });
            nav(`/app/records/${r.id}/edit`);
          })}>
            <Sparkles className="h-4 w-4" /> Draft the record from this project
          </Button>
        ) : undefined}
      >
        The draft is assembled from your measurements, approvals, obstacles and budget. You edit it before anyone else sees it.
      </Empty>
    );

  const r = b.record;
  const shared = b.threads.length > 0;
  const myVerifs = (data?.verifs ?? []).filter((v) => v.record_id === r.id);
  // T3 peer audits come only from the Ekoa audit schools, and never from your own school.
  const auditSchools = (data?.orgs ?? []).filter((o) => o.audit_school && o.id !== b.project.org_id);
  const partners = (data?.orgs ?? []).filter((o) => o.org_type === 'partner');

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.1fr]">
      <div className="space-y-3">
        <RecordTag r={r} href={`/app/library/${r.id}`} schoolName={b.org.name} />
        <p className="text-sm text-ink-mute">
          {r.status === 'published' ? `Published to the ${r.visibility === 'public' ? 'public library' : 'network'} on ${fmtDate(r.published_at)}.` : r.status === 'in_review' ? 'Waiting for the faculty liaison to review.' : 'Draft, visible to your school only.'} {OUTCOMES[r.outcome_class].label}. {TIERS[r.tier].label}.
        </p>
        {r.ai_drafted && <Notice tone="sky">Parts of this record were drafted automatically from project data. It stays labelled until a person edits it.</Notice>}
      </div>
      <div className="space-y-4">
        {canEdit && (
          <Panel title="Next steps for the record">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <LinkButton to={`/app/records/${r.id}/edit`} variant="ghost">Edit the record</LinkButton>
                {r.status === 'draft' && <Button busy={act.busy} onClick={() => act.run(async () => { await api.saveRecord({ id: r.id, org_id: r.org_id, status: 'in_review' }); onChange(); })}>Send to faculty review</Button>}
              </div>
              {isLiaison && r.status !== 'published' && (
                <div className="space-y-2 rounded-field border border-paper-line p-4">
                  <p className="font-bold">Publish</p>
                  <p className="text-sm text-ink-mute">Check that no student is named and photos show no identifiable people. Public records show school-level data only.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" busy={act.busy} onClick={() => act.run(async () => { await api.publishRecord(r, 'network', auth.person!.id); onChange(); })}>Publish to the network</Button>
                    <Button variant="dark" busy={act.busy} disabled={r.tier < 2} onClick={() => act.run(async () => { await api.publishRecord(r, 'public', auth.person!.id); onChange(); })}>Publish to the public library</Button>
                  </div>
                  {r.tier < 2 && <p className="text-xs text-ink-mute">Public records need tier T2 or higher.</p>}
                </div>
              )}
              <div className="space-y-2 rounded-field border border-paper-line p-4">
                <p className="font-bold">Peer review in a circle {shared && <Badge tone="leaf">Shared</Badge>}</p>
                {shared ? (
                  <p className="text-sm text-ink-soft">Shared in <Link className="font-bold text-leaf-600 underline" to={`/app/network/thread/${b.threads[0].id}`}>{b.threads[0].title}</Link>.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Select aria-label="Circle" value={circle} onChange={(e) => setCircle(e.target.value)} className="min-w-0 flex-1 basis-56">
                      <option value="">Choose a circle</option>
                      {data?.circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Button disabled={!circle} busy={act.busy} onClick={() => act.run(async () => { await api.createThread({ kind: 'circle', circle_id: circle, org_id: b.project.org_id, record_id: r.id, title: `Peer review please: ${r.title} record` }, auth.person!, `Our record draft for “${r.title}” is ready for feedback. What is missing for your school to use it?`, authorMeta(auth)); onChange(); })}>Share for review</Button>
                  </div>
                )}
              </div>
              <div className="space-y-2 rounded-field border border-paper-line p-4">
                <p className="font-bold">Request verification</p>
                <p className="text-sm text-ink-mute">T3: an Ekoa audit school (Shiv Nadar School, Faridabad or Green School, Bali) checks your raw data and photos against the protocol. T4: a partner verifies.</p>
                <div className="flex flex-wrap gap-2">
                  <Select aria-label="Verifier" value={verifier} onChange={(e) => setVerifier(e.target.value)} className="min-w-0 flex-1 basis-56">
                    <option value="">Choose a verifier</option>
                    <optgroup label="Peer audit (T3)">{auditSchools.map((o) => <option key={o.id} value={`3:${o.id}`}>{o.name}</option>)}</optgroup>
                    <optgroup label="Partner verification (T4)">{partners.map((o) => <option key={o.id} value={`4:${o.id}`}>{o.name}</option>)}</optgroup>
                  </Select>
                  <Button variant="ghost" disabled={!verifier} busy={act.busy} onClick={() => act.run(async () => { const [t, org] = verifier.split(':'); await api.requestVerification({ record_id: r.id, requested_tier: Number(t) as 3 | 4, requested_by_org: b.project.org_id, verifier_org: org, notes: '' }); setVerifier(''); onChange(); })}>Send request</Button>
                </div>
                {myVerifs.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {myVerifs.map((v) => <li key={v.id} className="flex justify-between gap-2"><span>T{v.requested_tier} by {data?.orgs.find((o) => o.id === v.verifier_org)?.name}</span><Badge tone={v.status === 'verified' ? 'leaf' : v.status === 'declined' ? 'alert' : 'clay'}>{v.status.replace('_', ' ')}</Badge></li>)}
                  </ul>
                )}
              </div>
              <ErrorNote>{act.error}</ErrorNote>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

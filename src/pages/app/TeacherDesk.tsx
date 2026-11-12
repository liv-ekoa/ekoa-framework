import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpenCheck, FilePlus2, GraduationCap, Library, ScrollText } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { loadSchool } from '@/lib/bundle';
import { CATEGORIES, STAGES } from '@/lib/ekoa';
import { fmtDate } from '@/lib/format';
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Modal, Notice, PageHeader, Panel, Select, Textarea } from '@/components/ui';
import type { Project } from '@/lib/types';

/** Where a teacher helps students at their own school and shares the school's work with the network. */
export default function TeacherDesk() {
  const auth = useAuth();
  const nav = useNavigate();
  const orgId = auth.activeOrg!.id;
  const isTeacher = auth.has('faculty_liaison', orgId);
  const { data, reload } = useData(async () => {
    const [s, people, policies, offers] = await Promise.all([loadSchool(orgId), api.listPeople(), api.listPolicies(), api.listClauseOffers()]);
    return { s, names: Object.fromEntries(people.map((p) => [p.id, p.display_name])) as Record<string, string>, policies: policies.filter((p) => p.org_id === orgId), offers: offers.filter((o) => o.org_id === orgId) };
  }, [orgId]);
  const act = useAction();
  const [pastOpen, setPastOpen] = useState(false);
  const [past, setPast] = useState({ title: '', category: 'Waste', summary: '' });
  const [offerOpen, setOfferOpen] = useState(false);
  const [offer, setOffer] = useState({ policyId: '', sectionKey: '', note: '' });
  if (!isTeacher) return <Empty title="Teachers only">The Teacher desk is for faculty liaisons. Students start and run their projects from Projects.</Empty>;
  if (!data) return <Loading />;
  const { s, names, policies, offers } = data;
  const open = s.projects.filter((p) => p.status === 'active');
  const waiting = open.filter((p) => p.scope === 'individual' && !p.mentor_person_id);
  const mine = open.filter((p) => p.mentor_person_id === auth.person?.id);
  const rest = open.filter((p) => !waiting.includes(p) && !mine.includes(p));
  const tasksOpen = (p: Project) => s.tasks.filter((t) => t.project_id === p.id && t.status !== 'done').length;
  const drafts = s.records.filter((r) => r.status !== 'published');
  const published = s.records.filter((r) => r.status === 'published');
  const pol = policies.find((p) => p.id === offer.policyId);
  const sec = pol?.sections.find((x) => x.key === offer.sectionKey);

  const Row = ({ p, claim }: { p: Project; claim?: boolean }) => (
    <li className="flex flex-wrap items-center gap-3 rounded-field border border-paper-line bg-white p-3">
      <div className="min-w-0 flex-1">
        <Link to={`/app/projects/${p.id}`} className="font-bold text-ink hover:text-leaf-600 hover:underline">{p.title}</Link>
        <p className="text-xs text-ink-mute">{p.scope === 'individual' ? `Led by ${names[p.lead_person_id ?? ''] ?? 'a student'}` : 'School team'}. Stage {STAGES.findIndex((x) => x.key === p.stage) + 1} of 6, {STAGES.find((x) => x.key === p.stage)?.name}. {tasksOpen(p)} to-dos open.</p>
      </div>
      {claim && <Button size="sm" busy={act.busy} onClick={() => act.run(async () => { await api.updateProject(p.id, { mentor_person_id: auth.person!.id }); await reload(); })}>I will verify this</Button>}
      <Link to={`/app/projects/${p.id}`} className="text-sm font-bold text-leaf-600 hover:underline">Open</Link>
    </li>
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Teacher desk" lead="Help the students at your school, and share your school's work with the network." />
      <ErrorNote>{act.error}</ErrorNote>

      <Panel title={<span className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-leaf-600" aria-hidden /> Your students' projects</span>}>
        {waiting.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2 flex items-center gap-2 font-bold">Waiting for a teacher <Badge tone="clay">{waiting.length}</Badge></h3>
            <p className="mb-2 text-sm text-ink-mute">Students can start without a teacher. Take a project on when you are ready to verify it.</p>
            <ul className="space-y-2">{waiting.map((p) => <Row key={p.id} p={p} claim />)}</ul>
          </section>
        )}
        {mine.length > 0 && <section className="mb-5"><h3 className="mb-2 font-bold">You verify these</h3><ul className="space-y-2">{mine.map((p) => <Row key={p.id} p={p} />)}</ul></section>}
        {rest.length > 0 && <section><h3 className="mb-2 font-bold">Everything else at your school</h3><ul className="space-y-2">{rest.map((p) => <Row key={p.id} p={p} />)}</ul></section>}
        {!open.length && <p className="text-ink-soft">No active projects yet. Students start theirs from <Link to="/app/projects/new" className="font-bold text-leaf-600 underline">Start a project</Link>, and you can start one for a student too.</p>}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={<span className="flex items-center gap-2"><FilePlus2 className="h-5 w-5 text-clay-600" aria-hidden /> Past work</span>}>
          <p className="text-sm text-ink-soft">Something your school did before Ekoa? Write it up as a record so other schools can learn from it, failures included.</p>
          <Button className="mt-4" onClick={() => setPastOpen(true)}>Add past work</Button>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-clay-600" aria-hidden /> A policy</span>}>
          <p className="text-sm text-ink-soft">Your school's policies stay private. You can offer a clause to the shared library, and an Ekoa steward reviews it first.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={!policies.length} onClick={() => setOfferOpen(true)}>Offer a clause</Button>
            <Link to="/app/governance?tab=policies" className="inline-flex items-center rounded-full border border-paper-line bg-white px-5 py-2 font-semibold hover:border-leaf/60">{policies.length ? 'Your policies' : 'Write a policy'}</Link>
          </div>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><Library className="h-5 w-5 text-clay-600" aria-hidden /> A finished project</span>}>
          <p className="text-sm text-ink-soft">Every project ends as a record. Open the project's Record tab to review it and publish it.</p>
          <Link to="/app/library" className="mt-4 inline-flex items-center rounded-full border border-paper-line bg-white px-5 py-2 font-semibold hover:border-leaf/60">See the Library</Link>
        </Panel>
      </div>

      <Panel title={<span className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-leaf-600" aria-hidden /> Your school's records</span>}>
        {drafts.length === 0 && published.length === 0 && <p className="text-ink-soft">No records yet.</p>}
        <ul className="space-y-2">
          {[...drafts, ...published].map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-field border border-paper-line bg-white p-3">
              <div className="min-w-0 flex-1"><Link to={`/app/library/${r.id}`} className="font-bold hover:text-leaf-600 hover:underline">{r.title}</Link><p className="text-xs text-ink-mute">{r.category}. {r.status === 'published' ? `Published ${fmtDate(r.published_at ?? r.updated_at)}` : 'Draft'}</p></div>
              <Badge tone={r.status === 'published' ? 'leaf' : 'clay'}>{r.status === 'published' ? 'Published' : 'Draft'}</Badge>
              {r.status !== 'published' && <Link to={`/app/records/${r.id}/edit`} className="text-sm font-bold text-leaf-600 hover:underline">Edit</Link>}
              {r.status !== 'published' && <Button size="sm" variant="primary" busy={act.busy} onClick={() => act.run(async () => { await api.publishRecord(r, 'network', auth.person!.id); await reload(); })}>Publish to the network</Button>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-mute">Publishing to the network shows the record to members of other schools. Public records need to be verified to tier T2 first. Check that no student is named.</p>
      </Panel>

      {offers.length > 0 && (
        <Panel title="Your clause offers">
          <ul className="space-y-2">{offers.map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-field border border-paper-line bg-white p-3 text-sm"><span><b>{o.title}</b> <span className="text-ink-mute">{o.section}. Offered {fmtDate(o.created_at)}</span></span><Badge tone={o.status === 'accepted' ? 'leaf' : o.status === 'declined' ? 'lesson' : 'clay'}>{o.status === 'pending' ? 'Waiting for a steward' : o.status === 'accepted' ? 'In the library' : 'Not added'}</Badge></li>)}</ul>
        </Panel>
      )}

      <Modal open={pastOpen} onClose={() => setPastOpen(false)} title="Add past work">
        <div className="space-y-4">
          <Notice tone="sky">This makes a private draft. You can fill in the details and publish it when you are ready. Leave students' names out.</Notice>
          <Field label="Title" id="pw-t"><Input id="pw-t" value={past.title} onChange={(e) => setPast({ ...past, title: e.target.value })} placeholder="For example: Composting the canteen's food waste" /></Field>
          <Field label="What is it about?" id="pw-c"><Select id="pw-c" value={past.category} onChange={(e) => setPast({ ...past, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Short summary" id="pw-s" hint="What was done, and what changed?"><Textarea id="pw-s" rows={3} value={past.summary} onChange={(e) => setPast({ ...past, summary: e.target.value })} /></Field>
          <ErrorNote>{act.error}</ErrorNote>
          <Button busy={act.busy} onClick={() => act.run(async () => {
            if (past.title.trim().length < 5) throw new Error('Give it a title.');
            if (past.summary.trim().length < 20) throw new Error('Add a short summary of what was done.');
            const r = await api.createPastWorkRecord(s.org, past);
            nav(`/app/records/${r.id}/edit`);
          })}>Create the draft</Button>
        </div>
      </Modal>

      <Modal open={offerOpen} onClose={() => setOfferOpen(false)} title="Offer a clause to the library" wide>
        <div className="space-y-4">
          <p className="text-ink-soft">Pick a clause from one of your policies. It goes to an Ekoa steward, and if they add it, other schools can use it and your school is credited.</p>
          <Field label="Policy" id="of-p"><Select id="of-p" value={offer.policyId} onChange={(e) => setOffer({ policyId: e.target.value, sectionKey: '', note: offer.note })}><option value="">Choose a policy</option>{policies.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
          {pol && <Field label="Clause" id="of-s"><Select id="of-s" value={offer.sectionKey} onChange={(e) => setOffer({ ...offer, sectionKey: e.target.value })}><option value="">Choose a clause</option>{pol.sections.map((x) => <option key={x.key} value={x.key}>{x.title}</option>)}</Select></Field>}
          {sec && <div className="rounded-field bg-paper p-3 text-sm"><p className="font-bold">{sec.title}</p><p className="mt-1 whitespace-pre-line text-ink-soft">{sec.body}</p></div>}
          <Field label="Note for the steward (optional)" id="of-n" hint="Where did this clause come from, and has it worked?"><Textarea id="of-n" rows={2} value={offer.note} onChange={(e) => setOffer({ ...offer, note: e.target.value })} /></Field>
          <ErrorNote>{act.error}</ErrorNote>
          <Button busy={act.busy} onClick={() => act.run(async () => {
            if (!pol || !sec) throw new Error('Choose a policy and a clause.');
            await api.offerClause(orgId, pol.id, sec.key.split('-')[0] || 'General', sec.title, sec.body, offer.note);
            setOfferOpen(false); setOffer({ policyId: '', sectionKey: '', note: '' }); await reload();
          })}>Send to a steward</Button>
        </div>
      </Modal>
    </div>
  );
}

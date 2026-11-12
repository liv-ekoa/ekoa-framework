import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GitFork, MessagesSquare, PenLine } from 'lucide-react';
import * as api from '@/lib/api';
import { authorMeta, useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { contextDifferences } from '@/lib/context';
import { RecordDetail } from '@/components/RecordDetail';
import { Button, Empty, ErrorNote, Field, Input, LinkButton, Loading, Modal, Notice, Textarea } from '@/components/ui';

export default function RecordView() {
  const { id } = useParams();
  const auth = useAuth();
  const nav = useNavigate();
  const { data, error } = useData(async () => {
    const [r, orgs, adaptations, projects, records] = await Promise.all([api.getRecord(id!), api.listOrgs(), api.listAdaptations(), api.listProjects(), api.listRecords()]);
    return { r, orgs, adaptations, projects, records };
  }, [id]);
  const [adapting, setAdapting] = useState(false);
  const [diffs, setDiffs] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [intro, setIntro] = useState(false);
  const [introMsg, setIntroMsg] = useState('');
  const act = useAction();

  if (error) return <Empty title="Record not found">It may be a draft from another school.</Empty>;
  if (!data) return <Loading />;
  const { r } = data;
  const org = data.orgs.find((o) => o.id === r.org_id) ?? null;
  const mine = auth.orgs.some((o) => o.id === r.org_id);
  const inSchool = auth.activeOrg?.org_type === 'school';
  const canAdapt = inSchool && !mine && auth.has(['project_lead', 'board_member', 'ekoa_rep', 'faculty_liaison']);
  const canEdit = mine && auth.has(['project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'faculty_liaison'], r.org_id);

  const openAdapt = () => {
    const mineCtx = auth.activeOrg?.context_profile;
    setDiffs(mineCtx ? contextDifferences(r.context, mineCtx) : {});
    setAdapting(true);
  };

  return (
    <div>
      <Link to="/app/library" className="text-sm font-bold text-ink-mute hover:text-ink">Library</Link>
      <div className="mt-3">
        <RecordDetail
          r={r} org={org} orgs={data.orgs} adaptations={data.adaptations} projects={data.projects} records={data.records} linkBase="/app/library"
          actions={
            <>
              {canAdapt && <Button variant="dark" onClick={openAdapt}><GitFork className="h-4 w-4" /> Adapt this model</Button>}
              {canAdapt && auth.has(['ekoa_rep', 'faculty_liaison']) && <Button variant="ghost" onClick={() => setIntro(true)}><MessagesSquare className="h-4 w-4" /> Ask for an introduction</Button>}
              {canEdit && <LinkButton to={`/app/records/${r.id}/edit`} variant="ghost"><PenLine className="h-4 w-4" /> Edit record</LinkButton>}
              {r.project_id && mine && <LinkButton to={`/app/projects/${r.project_id}?tab=record`} variant="quiet">Open the project</LinkButton>}
            </>
          }
        />
      </div>

      <Modal open={adapting} onClose={() => setAdapting(false)} title={`Adapt “${r.title}”`} wide>
        <div className="space-y-4">
          <p className="text-ink-soft">This starts a new project at {auth.activeOrg?.name}, pre-filled from the record. Note what is different here, so the adaptation is honest and the lineage is useful to others.</p>
          {Object.keys(diffs).length > 0 && <Notice tone="sky">Pre-filled from comparing the two school profiles. Edit anything that is wrong.</Notice>}
          {['climate', 'budget', 'size', 'contractor', 'governance', 'language'].map((k) => (
            <Field key={k} label={`What is different: ${k}`} id={`ad-${k}`}>
              <Input id={`ad-${k}`} value={diffs[k] ?? ''} onChange={(e) => setDiffs({ ...diffs, [k]: e.target.value })} placeholder="Leave blank if the same" />
            </Field>
          ))}
          <Field label="What will you change in the model?" id="ad-n"><Textarea id="ad-n" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <ErrorNote>{act.error}</ErrorNote>
          <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => { const p = await api.adaptRecord(r, auth.activeOrg!.id, Object.fromEntries(Object.entries(diffs).filter(([, v]) => v.trim())), notes, auth.person!.id); nav(`/app/projects/${p.id}`); })}>Create the adapted project</Button>
        </div>
      </Modal>

      <Modal open={intro} onClose={() => setIntro(false)} title="Ask for an introduction">
        <div className="space-y-4">
          <p className="text-ink-soft">This opens a moderated thread between the Ekoa Representatives of both schools. Both faculty liaisons and the Ekoa admins can see it. Never share phone numbers or social handles.</p>
          <Field label="Your question for the other school" id="in-m"><Textarea id="in-m" rows={4} value={introMsg} onChange={(e) => setIntroMsg(e.target.value)} /></Field>
          <ErrorNote>{act.error}</ErrorNote>
          <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => {
            if (introMsg.trim().length < 10) throw new Error('Write a question first.');
            const res = await api.createThread({ kind: 'twin', circle_id: null, org_id: auth.activeOrg!.id, org_b: r.org_id, record_id: r.id, title: `${auth.activeOrg!.name} asks ${org?.name ?? 'the source school'} about “${r.title}”` }, auth.person!, introMsg, authorMeta(auth));
            nav(`/app/network/thread/${res.thread.id}`);
          })}>Send</Button>
        </div>
      </Modal>
    </div>
  );
}

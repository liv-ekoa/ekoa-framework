import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Download, Plus, Printer, Trash2 } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';
import type { Policy, PolicySection } from '@/lib/types';
import { Badge, Button, ErrorNote, Field, Input, Loading, Modal, Notice, Panel, Textarea, cx } from '@/components/ui';

const FLOW: Policy['status'][] = ['draft', 'internal_review', 'approved', 'adopted'];
const LABEL: Record<Policy['status'], string> = { draft: 'Draft', internal_review: 'Internal review', approved: 'Approved', adopted: 'Adopted', amended: 'Adopted and amended' };

function downloadWord(p: Policy, school: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<html><head><meta charset="utf-8"><title>${esc(p.title)}</title></head><body style="font-family:Calibri,Arial;font-size:11pt;line-height:1.5">
<p style="color:#666">${esc(school)}. Version ${p.version}. Status: ${LABEL[p.status]}.</p><h1>${esc(p.title)}</h1>
${p.sections.map((s, i) => `<h2>${i + 1}. ${esc(s.title)}</h2><p>${esc(s.body).replace(/\n/g, '<br>')}</p>`).join('')}
</body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${p.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-v${p.version}.doc`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function PolicyEditor() {
  const { id } = useParams();
  const auth = useAuth();
  const { data, reload } = useData(async () => {
    const [p, clauses, amendments] = await Promise.all([api.getPolicy(id!), api.listClauses(), api.listAmendments()]);
    return { p, clauses, amendments: amendments.filter((a) => a.policy_id === id) };
  }, [id]);
  const [p, setP] = useState<Policy | null>(null);
  const [picking, setPicking] = useState(false);
  const [amend, setAmend] = useState('');
  const act = useAction();
  useEffect(() => { if (data) setP(data.p); }, [data]);
  if (!p || !data) return <Loading />;
  const canEdit = auth.has(['project_lead', 'board_member', 'faculty_liaison'], p.org_id);
  const canAdvance = auth.has(['faculty_liaison', 'approver'], p.org_id);
  const adopted = p.status === 'adopted' || p.status === 'amended';
  const dirty = JSON.stringify(p.sections) !== JSON.stringify(data.p.sections) || p.title !== data.p.title;
  const setSection = (i: number, patch: Partial<PolicySection>) => setP({ ...p, sections: p.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const move = (i: number, d: number) => {
    const s = [...p.sections];
    const [x] = s.splice(i, 1);
    s.splice(i + d, 0, x);
    setP({ ...p, sections: s });
  };

  const save = () => act.run(async () => {
    if (adopted) {
      if (amend.trim().length < 5) throw new Error('Describe the amendment in a sentence. Adopted policies keep a public amendment log.');
      await api.savePolicy({ ...p, status: 'amended', version: p.version + 1 });
      await api.addAmendment({ policy_id: p.id, summary: amend.trim(), adopted_on: new Date().toISOString().slice(0, 10) });
      setAmend('');
    } else {
      await api.savePolicy(p);
    }
    await reload();
  });

  const advance = (to: Policy['status']) => act.run(async () => {
    await api.savePolicy({ ...p, status: to, ...(to === 'adopted' ? { adopted_at: new Date().toISOString() } : {}) });
    if (to === 'adopted') await api.bumpClauseAdoptions(p.sections.map((s) => s.clause_id).filter((x): x is string => !!x));
    await api.audit(auth.person!.id, `policy status: ${to}`, 'policies', p.id);
    await reload();
  });

  const idx = FLOW.indexOf(p.status === 'amended' ? 'adopted' : p.status);

  return (
    <div>
      <Link to="/app/governance?tab=policies" className="no-print text-sm font-bold text-ink-mute hover:text-ink">Governance</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {canEdit ? <Input aria-label="Policy title" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} className="font-display text-2xl font-bold" /> : <h1 className="text-2xl font-bold">{p.title}</h1>}
          <p className="mt-2 text-sm text-ink-mute">{auth.activeOrg?.name}. Version {p.version}. {p.adopted_at ? `Adopted ${fmtDate(p.adopted_at)}.` : ''}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => downloadWord(p, auth.activeOrg?.name ?? '')}><Download className="h-4 w-4" /> Word document</Button>
          <Button variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save as PDF</Button>
        </div>
      </div>

      <ol className="no-print mt-5 flex flex-wrap gap-2" aria-label="Policy status">
        {FLOW.map((s, i) => <li key={s}><Badge tone={i < idx ? 'leaf' : i === idx ? 'clay' : 'mute'}>{i + 1}. {LABEL[s]}</Badge></li>)}
        {p.status === 'amended' && <li><Badge tone="sky">Amended</Badge></li>}
      </ol>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          {p.sections.map((s, i) => (
            <section key={s.key} className="rounded-panel border border-paper-line bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="mt-2 font-display text-lg font-bold tabular-nums text-ink-mute">{i + 1}</span>
                <div className="flex-1 space-y-2">
                  {canEdit ? <Input aria-label="Section title" value={s.title} onChange={(e) => setSection(i, { title: e.target.value })} className="font-bold" /> : <h2 className="text-lg font-semibold">{s.title}</h2>}
                  {canEdit ? <Textarea aria-label="Section text" rows={4} value={s.body} onChange={(e) => setSection(i, { body: e.target.value })} /> : <p className="text-ink-soft">{s.body}</p>}
                </div>
                {canEdit && (
                  <div className="no-print flex flex-col gap-1">
                    <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-ink-mute hover:text-ink disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button aria-label="Move down" disabled={i === p.sections.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-ink-mute hover:text-ink disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button aria-label="Remove section" onClick={() => setP({ ...p, sections: p.sections.filter((_, j) => j !== i) })} className="rounded p-1 text-ink-mute hover:text-alert"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            </section>
          ))}
          {canEdit && (
            <div className="no-print flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setPicking(true)}><Plus className="h-4 w-4" /> Add a clause from the library</Button>
              <Button variant="quiet" onClick={() => setP({ ...p, sections: [...p.sections, { key: `custom-${Date.now()}`, title: 'New section', body: '', clause_id: null }] })}>Add a blank section</Button>
            </div>
          )}
        </div>

        <aside className="no-print space-y-4">
          {canEdit && (
            <Panel title={adopted ? 'Amend the adopted policy' : 'Save changes'}>
              <div className="space-y-3">
                {adopted && <Field label="What does this amendment change?" id="am"><Input id="am" value={amend} onChange={(e) => setAmend(e.target.value)} /></Field>}
                <ErrorNote>{act.error}</ErrorNote>
                <Button variant="dark" disabled={!dirty} busy={act.busy} onClick={save}>{adopted ? 'Adopt amendment' : 'Save draft'}</Button>
                {dirty && <p className="text-xs text-ink-mute">You have unsaved changes.</p>}
              </div>
            </Panel>
          )}
          {!adopted && (
            <Panel title="Move it forward">
              <p className="text-sm text-ink-soft">Policies go through the same approval chain as proposals. The faculty liaison records each stage.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {FLOW.slice(idx + 1, idx + 2).map((s) => <Button key={s} disabled={!canAdvance || dirty} busy={act.busy} onClick={() => advance(s)}>Mark as {LABEL[s].toLowerCase()}</Button>)}
              </div>
              {!canAdvance && <p className="mt-2 text-xs text-ink-mute">Only the faculty liaison or an approver can change the status.</p>}
              {dirty && canAdvance && <p className="mt-2 text-xs text-ink-mute">Save your changes first.</p>}
            </Panel>
          )}
          <Panel title="Amendment log">
            {data.amendments.length ? <ul className="space-y-2 text-sm">{data.amendments.map((a) => <li key={a.id}><span className="font-bold">{fmtDate(a.adopted_on)}</span> {a.summary}</li>)}</ul> : <p className="text-sm text-ink-mute">No amendments yet. Each one counts as a policy change in the cohort report.</p>}
          </Panel>
          {adopted && <Notice tone="leaf">Adopted. Every clause you used from the library now counts one more adoption, so other schools can see what works.</Notice>}
        </aside>
      </div>

      <Modal open={picking} onClose={() => setPicking(false)} title="Clause library" wide>
        <ul className="space-y-3">
          {data.clauses.map((c) => {
            const used = p.sections.some((s) => s.clause_id === c.id);
            return (
              <li key={c.id} className={cx('rounded-field border p-4', used ? 'border-leaf/40 bg-leaf-50' : 'border-paper-line')}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold">{c.title}</p><p className="mt-1 text-sm text-ink-soft">{c.body}</p><p className="mt-1 text-xs text-ink-mute">Adopted by {c.adoption_count} {c.adoption_count === 1 ? 'school' : 'schools'}</p></div>
                  <Button size="sm" variant={used ? 'quiet' : 'ghost'} disabled={used} onClick={() => { setP({ ...p, sections: [...p.sections, { key: `${c.section}-${c.id.slice(-4)}-${Date.now()}`, title: c.title, body: c.body, clause_id: c.id }] }); setPicking(false); }}>{used ? 'In policy' : 'Add'}</Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Modal>
    </div>
  );
}

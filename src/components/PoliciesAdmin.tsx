import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react';
import * as api from '@/lib/api';
import { useAction, useData } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';
import { ALL_COUNTRIES } from '@/lib/funding';
import { splitPolicy } from '@/lib/policyText';
import type { Organisation, Policy, PolicySection } from '@/lib/types';
import { Badge, Button, Checkbox, Empty, ErrorNote, Field, Input, Loading, Notice, Panel, Select, Textarea } from './ui';

const BLANK = { orgId: '', newSchool: false, name: '', city: '', country: '', title: '', text: '', adopted: true, adoptedOn: '' };

/** Admins add the real, adopted policies of schools so the public Policy library is full of real
 *  policies from day one. Adopted policies are public the moment they are saved. */
export function PoliciesAdmin({ orgs, reload: reloadAll }: { orgs: Organisation[]; reload: () => void }) {
  const act = useAction();
  const { data: policies, reload } = useData(() => api.listPolicies());
  const [f, setF] = useState(BLANK);
  const [sections, setSections] = useState<{ title: string; body: string }[] | null>(null);
  const [saved, setSaved] = useState<Policy | null>(null);
  const schools = orgs.filter((o) => o.org_type === 'school').sort((a, b) => a.name.localeCompare(b.name));
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const move = (i: number, d: number) => setSections((s) => { if (!s) return s; const n = [...s]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });

  const save = () => act.run(async () => {
    if (f.title.trim().length < 3) throw new Error('Give the policy its title.');
    const parts = (sections ?? []).filter((s) => s.title.trim() || s.body.trim());
    if (!parts.length) throw new Error('Paste the policy text, then check the sections.');
    let orgId = f.orgId;
    if (f.newSchool) {
      if (f.name.trim().length < 3 || !f.country) throw new Error('Add the school’s name and country.');
      const org = await api.createOrg({ name: f.name.trim(), city: f.city.trim(), country: f.country, org_type: 'school', status: 'active', public_visible: true });
      orgId = org.id;
      reloadAll();
    }
    if (!orgId) throw new Error('Choose the school.');
    const stamp = Date.now();
    const p = await api.savePolicy({
      org_id: orgId, title: f.title.trim(), status: f.adopted ? 'adopted' : 'draft',
      adopted_at: f.adopted ? (f.adoptedOn ? new Date(f.adoptedOn).toISOString() : new Date().toISOString()) : null,
      sections: parts.map((s, i): PolicySection => ({ key: `s${i + 1}-${stamp}`, title: s.title.trim() || `Section ${i + 1}`, body: s.body.trim(), clause_id: null })),
    });
    setSaved(p);
    setF(BLANK);
    setSections(null);
    reload();
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <Panel title="Add a school’s policy">
        <p className="mb-4 text-sm text-ink-soft">For a policy a school has written or already adopted. Paste the whole text: Ekoa splits it into sections, which you can check before saving. Adopted policies appear in the public Policy library straight away.</p>
        {saved && (
          <div className="mb-4"><Notice tone="leaf">Saved “{saved.title}”. {saved.status === 'adopted' ? <Link to={`/app/library/policies/${saved.id}`} className="font-bold underline">See it in the library</Link> : <Link to={`/app/governance/policy/${saved.id}`} className="font-bold underline">Open the draft</Link>}</Notice></div>
        )}
        <div className="space-y-4">
          <Checkbox checked={f.newSchool} onChange={(v) => setF({ ...f, newSchool: v })} label="The school is not on Ekoa yet" hint="Adds the school so its policy can be listed. Its teachers can join later." />
          {f.newSchool ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="School name" id="pa-n"><Input id="pa-n" value={f.name} onChange={set('name')} /></Field>
              <Field label="City" id="pa-c"><Input id="pa-c" value={f.city} onChange={set('city')} /></Field>
              <Field label="Country" id="pa-co"><Select id="pa-co" value={f.country} onChange={set('country')}><option value="">Choose</option>{ALL_COUNTRIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            </div>
          ) : (
            <Field label="School" id="pa-s"><Select id="pa-s" value={f.orgId} onChange={set('orgId')}><option value="">Choose a school</option>{schools.map((o) => <option key={o.id} value={o.id}>{o.name}{o.city ? `, ${o.city}` : ''}</option>)}</Select></Field>
          )}
          <Field label="Policy title" id="pa-t"><Input id="pa-t" value={f.title} onChange={set('title')} placeholder="For example: Waste Management Policy" /></Field>
          <Field label="The policy text" id="pa-x" hint="Paste it from the school’s document. Headings on their own line become sections.">
            <Textarea id="pa-x" rows={10} value={f.text} onChange={(e) => { setF({ ...f, text: e.target.value }); setSections(null); }} />
          </Field>
          <Button variant="ghost" disabled={!f.text.trim()} onClick={() => setSections(splitPolicy(f.text))}>Split into sections</Button>
          {sections && (
            <div className="space-y-3">
              <p className="text-sm font-bold">{sections.length} sections. Fix any heading that came out wrong.</p>
              {sections.map((s, i) => (
                <div key={i} className="rounded-field border border-paper-line p-3">
                  <div className="flex items-center gap-2">
                    <Input aria-label={`Section ${i + 1} heading`} value={s.title} onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                    <button className="rounded-field p-1.5 text-ink-mute hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                    <button className="rounded-field p-1.5 text-ink-mute hover:text-ink disabled:opacity-30" disabled={i === sections.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
                    <button className="rounded-field p-1.5 text-ink-mute hover:text-alert" onClick={() => setSections(sections.filter((_, j) => j !== i))} aria-label="Remove section"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <Textarea aria-label={`Section ${i + 1} text`} className="mt-2" rows={3} value={s.body} onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
                </div>
              ))}
              <Button size="sm" variant="quiet" onClick={() => setSections([...sections, { title: '', body: '' }])}><Plus className="h-4 w-4" /> Add a section</Button>
            </div>
          )}
          <Checkbox checked={f.adopted} onChange={(v) => setF({ ...f, adopted: v })} label="The school has adopted this policy" hint="Adopted policies are public in the library. Untick to save it as a private draft for the school to finish." />
          {f.adopted && <div className="max-w-xs"><Field label="Adopted on (optional)" id="pa-d"><Input id="pa-d" type="date" value={f.adoptedOn} onChange={set('adoptedOn')} /></Field></div>}
          <ErrorNote>{act.error}</ErrorNote>
          <Button variant="dark" busy={act.busy} onClick={save}>{f.adopted ? 'Save and publish to the library' : 'Save as a draft'}</Button>
        </div>
      </Panel>

      <Panel title="Every policy in the network">
        {!policies ? <Loading /> : !policies.length ? <Empty title="No policies yet">Policies you add here, and those schools adopt, are listed here.</Empty> : (
          <ul className="divide-y divide-paper-line">
            {policies.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link to={`/app/governance/policy/${p.id}`} className="font-bold hover:underline">{p.title}</Link>
                  <p className="text-sm text-ink-soft">{orgs.find((o) => o.id === p.org_id)?.name ?? 'A school'}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-mute">
                    <Badge tone={p.status === 'adopted' || p.status === 'amended' ? 'leaf' : 'mute'}>{p.status === 'adopted' || p.status === 'amended' ? 'Public' : 'Private draft'}</Badge>
                    <span>{p.sections.length} sections, updated {fmtDate(p.updated_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(p.status === 'adopted' || p.status === 'amended') && <Link to={`/app/library/policies/${p.id}`} className="rounded-field p-1.5 text-ink-mute hover:text-ink" title="See it in the library"><ExternalLink className="h-4 w-4" /><span className="sr-only">See it in the library</span></Link>}
                  <button className="rounded-field p-1.5 text-ink-mute hover:text-alert" title="Delete this policy" onClick={() => { if (window.confirm(`Delete “${p.title}”? This cannot be undone.`)) void act.run(async () => { await api.deletePolicy(p.id); reload(); }); }}><Trash2 className="h-4 w-4" /><span className="sr-only">Delete this policy</span></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

import { useState } from 'react';
import { ExternalLink, FileText, Link2, Trash2 } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';
import { ReportContent } from './ReportContent';
import { Badge, Button, ErrorNote, Field, Input, Notice, Panel, Textarea } from './ui';

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
const isGoogle = (url: string) => /^(docs|drive|sheets|slides)\.google\.com$/.test(host(url));

/** Links that help with a policy: a Google Doc with the rota, a template, a guide another school
 *  wrote. Anyone in the school can add one; anyone can report one, which hides it at once. */
export function PolicyLinks({ policyId, orgId }: { policyId: string; orgId: string }) {
  const auth = useAuth();
  const act = useAction();
  const { data, reload } = useData(() => api.listPolicyLinks(policyId), [policyId]);
  const [f, setF] = useState({ url: '', title: '', note: '' });
  const [held, setHeld] = useState(false);
  const isLiaison = auth.isSteward || auth.has('faculty_liaison', orgId);
  const isMember = auth.roles.some((r) => r.org_id === orgId && r.status !== 'alumni');
  const links = data ?? [];
  return (
    <Panel title="Helpful links" id="links">
      <p className="mb-4 text-sm text-ink-soft">Google Docs, templates, rotas and guides that help put this policy into practice. Anyone in the school can add one.</p>
      {links.length ? (
        <ul className="divide-y divide-paper-line">
          {links.map((l) => (
            <li key={l.id} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 rounded-field bg-paper-deep p-2 text-ink-soft">{isGoogle(l.url) ? <FileText className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {l.hidden ? <span className="font-bold">{l.title}</span> : <a href={l.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-bold text-leaf-600 hover:underline">{l.title}<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>}
                  {isGoogle(l.url) && <Badge tone="sky">Google Doc</Badge>}
                  {l.hidden && <Badge tone="alert">Hidden for review</Badge>}
                </div>
                {l.note && <p className="text-sm text-ink-soft">{l.note}</p>}
                <p className="text-xs text-ink-mute">{host(l.url)}. Added by {l.added_by_name || 'a member'}, {fmtDate(l.created_at)}.</p>
              </div>
              <div className="flex items-center gap-1">
                {!l.hidden && l.added_by !== auth.person?.id && <ReportContent kind="policy_link" id={l.id} what="link" onDone={reload} />}
                {(l.added_by === auth.person?.id || isLiaison) && (
                  <button onClick={() => act.run(async () => { await api.removePolicyLink(l.id); reload(); })} className="rounded-field p-1.5 text-ink-mute hover:text-alert" title="Remove this link"><Trash2 className="h-4 w-4" aria-hidden /><span className="sr-only">Remove this link</span></button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-ink-mute">No links yet.</p>}
      {isMember && (
        <div className="no-print mt-4 space-y-3 border-t border-paper-line pt-4">
          {held && <Notice tone="clay">Your link was hidden because its title or note looked inappropriate. Your teacher will review it.</Notice>}
          <Field label="Link" id="pl-u" hint="A Google Doc, Sheet or Slides link, or any page that starts with https://. Check the document is shared with your school before you add it."><Input id="pl-u" type="url" inputMode="url" placeholder="https://docs.google.com/document/d/…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
          <Field label="Title" id="pl-t"><Input id="pl-t" placeholder="For example: Compost rota for this term" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Why it helps (optional)" id="pl-n"><Textarea id="pl-n" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <ErrorNote>{act.error}</ErrorNote>
          <Button busy={act.busy} onClick={() => act.run(async () => {
            const r = await api.addPolicyLink({ policy_id: policyId, ...f });
            setHeld(r.hidden);
            setF({ url: '', title: '', note: '' });
            reload();
          })}>Add link</Button>
        </div>
      )}
    </Panel>
  );
}

import { useState } from 'react';
import { ExternalLink, FileSpreadsheet, FileText, Link2, Presentation, Trash2, Upload } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import type { ProjectFile } from '@/lib/types';
import { Button, ErrorNote, Field, Input, Loading, Notice, Panel } from '@/components/ui';

export const useProjectFiles = (projectId: string) => useData(() => api.listProjectFiles(projectId), [projectId]);

const size = (n: number | null) => (n == null ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
function Icon({ f }: { f: ProjectFile }) {
  const c = 'h-5 w-5 text-leaf-600';
  if (f.link_url) return <Link2 className={c} aria-hidden />;
  if (/presentation|powerpoint/.test(f.file_type ?? '')) return <Presentation className={c} aria-hidden />;
  if (/sheet|excel|csv/.test(f.file_type ?? '')) return <FileSpreadsheet className={c} aria-hidden />;
  return <FileText className={c} aria-hidden />;
}

/** Everything the project has made, in one place: documents, slides, spreadsheets, PDFs and links. */
export function FilesTab({ b, canEdit, people }: { b: ProjectBundle; canEdit: boolean; people: Record<string, string> }) {
  const auth = useAuth();
  const { data: files, reload } = useProjectFiles(b.project.id);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [url, setUrl] = useState('');
  const upload = useAction();
  const link = useAction();
  const other = useAction();
  if (!files) return <Loading />;
  const canRemove = (f: ProjectFile) => f.added_by === auth.person?.id || auth.has('faculty_liaison', b.project.org_id) || auth.isSteward;
  const open = (f: ProjectFile) => other.run(async () => { const u = await api.projectFileUrl(f); if (u) window.open(u, '_blank', 'noopener'); });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div>
        {files.length ? (
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-panel border border-paper-line bg-white p-3">
                <Icon f={f} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{f.title}</p>
                  <p className="truncate text-xs text-ink-mute">{f.link_url ? new URL(f.link_url).hostname : `${f.file_name} · ${size(f.size_bytes)}`} · {people[f.added_by ?? ''] ?? 'A teammate'} · {fmtDate(f.created_at)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void open(f)}>{f.link_url ? <>Open <ExternalLink className="h-4 w-4" /></> : 'Download'}</Button>
                {canRemove(f) && <button aria-label={`Remove ${f.title}`} className="rounded p-1.5 text-ink-mute hover:text-alert" onClick={() => other.run(async () => { await api.deleteProjectFile(f); await reload(); })}><Trash2 className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-panel border border-dashed border-paper-line p-8 text-center">
            <p className="font-display text-lg font-semibold">Nothing here yet</p>
            <p className="mx-auto mt-1 max-w-prose text-sm text-ink-soft">Keep your reports, slides, spreadsheets and PDFs here, so your whole team and your teacher can find them without searching. Pasting a link to a shared document works too.</p>
          </div>
        )}
        <ErrorNote>{other.error}</ErrorNote>
      </div>

      {canEdit && (
        <div className="space-y-6">
          <Panel title="Add a file">
            <div className="space-y-3">
              <Field label="File" id="pf-f" hint="PDF, Word, PowerPoint, Excel, CSV or text, up to 25 MB. For Keynote or Pages, export to PDF."><Input id="pf-f" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.csv,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
              <Field label="Name (optional)" id="pf-t"><Input id="pf-t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: Week 3 waste log" /></Field>
              <ErrorNote>{upload.error}</ErrorNote>
              <Button busy={upload.busy} disabled={!file} onClick={() => upload.run(async () => { await api.uploadProjectFile(b.project.org_id, b.project.id, file!, title); setFile(null); setTitle(''); (document.getElementById('pf-f') as HTMLInputElement).value = ''; await reload(); })}><Upload className="h-4 w-4" /> Add file</Button>
            </div>
          </Panel>
          <Panel title="Or add a link">
            <div className="space-y-3">
              <Field label="Name" id="pf-ln"><Input id="pf-ln" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="For example: Our presentation" /></Field>
              <Field label="Link" id="pf-lu" hint="A shared Google Docs, Slides, Sheets or Drive link. Check that your teacher can open it."><Input id="pf-lu" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
              <ErrorNote>{link.error}</ErrorNote>
              <Button variant="ghost" busy={link.busy} onClick={() => link.run(async () => { await api.addProjectLink(b.project.org_id, b.project.id, linkTitle, url); setLinkTitle(''); setUrl(''); await reload(); })}><Link2 className="h-4 w-4" /> Add link</Button>
            </div>
          </Panel>
          <Notice tone="sky">Your teachers can see every file here, and no other school can. Keep phone numbers, home addresses and photos of people out of documents. Put photos of your work in Evidence.</Notice>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { EyeOff, ImageOff, Upload } from 'lucide-react';
import { decideFlag, evidenceUrl, listFlags, uploadEvidence } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { FLAG_REASONS } from '@/lib/moderation';
import { ReportContent } from '@/components/ReportContent';
import { useAction, useData } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import type { Evidence } from '@/lib/types';
import { Badge, Button, Checkbox, Empty, ErrorNote, Field, Input, Notice, Panel } from '@/components/ui';

function Thumb({ e }: { e: Evidence }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { void evidenceUrl(e).then(setUrl); }, [e]);
  return url ? <img src={url} alt={e.caption} className="aspect-[4/3] w-full rounded-field object-cover" /> : <div className="flex aspect-[4/3] w-full items-center justify-center rounded-field bg-paper-deep text-ink-mute"><ImageOff className="h-6 w-6" aria-label="Preview unavailable" /></div>;
}

export function EvidenceTab({ b, canEdit, onChange }: { b: ProjectBundle; canEdit: boolean; onChange: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [people, setPeople] = useState(false);
  const [consent, setConsent] = useState(false);
  const [checking, setChecking] = useState(false);
  const act = useAction();
  const auth = useAuth();
  const isModerator = auth.isSteward || auth.has('faculty_liaison', b.project.org_id);
  const { data: flags, reload: reloadFlags } = useData(() => (isModerator ? listFlags() : Promise.resolve([])), [isModerator, b.evidence.length]);
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div>
        {b.evidence.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {b.evidence.map((e) => {
              const open = (flags ?? []).filter((f) => f.target_id === e.id && f.status === 'open');
              return (
                <li key={e.id} className={e.hidden ? 'rounded-panel border border-alert/40 bg-alert-100/40 p-3' : 'rounded-panel border border-paper-line bg-white p-3'}>
                  {e.hidden && !isModerator ? <div className="flex aspect-[4/3] w-full items-center justify-center gap-2 rounded-field bg-paper-deep text-sm text-ink-mute"><EyeOff className="h-5 w-5" /> Hidden for review</div> : <Thumb e={e} />}
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-bold">{e.caption || e.file_name}</p>
                    {!e.hidden && <ReportContent kind="evidence" id={e.id} what="photo" onDone={onChange} />}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-ink-mute"><span>{fmtDate(e.created_at)}</span>{e.exif_stripped && <Badge tone="leaf">Location removed</Badge>}{e.contains_people && <Badge tone="clay">Shows people</Badge>}</div>
                  {e.hidden && isModerator && (
                    <div className="mt-2 space-y-2">
                      <Badge tone="alert">Hidden: {open[0] ? FLAG_REASONS[open[0].reason].label.toLowerCase() : 'removed'}</Badge>
                      {open[0] && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" busy={act.busy} onClick={() => act.run(async () => { await decideFlag(open[0], 'restored', auth.person!.id); reloadFlags(); onChange(); })}>Restore</Button>
                          <Button size="sm" variant="danger" busy={act.busy} onClick={() => act.run(async () => { await decideFlag(open[0], 'removed', auth.person!.id); reloadFlags(); onChange(); })}>Keep removed</Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : <Empty title="No evidence yet">Photos of bins, scales, log sheets and sites raise a measurement to tier T1.</Empty>}
      </div>
      {canEdit && (
        <Panel title="Add evidence">
          <div className="space-y-4">
            <Notice tone="sky">Photograph the bins, the scale or the log sheet, not people. Location data is removed from every photo when it uploads, and every photo is checked for nudity on your device before it leaves.</Notice>
            <Field label="Photo" id="ev-f"><Input id="ev-f" type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
            <Field label="Caption" id="ev-c"><Input id="ev-c" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="For example: compost sample, week 6" /></Field>
            <Checkbox checked={people} onChange={setPeople} label="This photo shows identifiable people" />
            {people && <Checkbox checked={consent} onChange={setConsent} label="Every person shown has guardian consent for photos" hint="Your faculty liaison can check consent under My School." />}
            <ErrorNote>{act.error}</ErrorNote>
            <Button busy={act.busy} disabled={!file} onClick={() => act.run(async () => {
              setChecking(true);
              try { await uploadEvidence(b.project.org_id, b.project.id, file!, caption, people, consent); } finally { setChecking(false); }
              setFile(null); setCaption(''); setPeople(false); setConsent(false); onChange();
            })}><Upload className="h-4 w-4" /> Upload</Button>
            {checking && <p className="text-xs text-ink-mute">Checking the photo before it uploads…</p>}
          </div>
        </Panel>
      )}
    </div>
  );
}

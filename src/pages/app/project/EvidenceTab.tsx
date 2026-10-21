import { useEffect, useState } from 'react';
import { ImageOff, Upload } from 'lucide-react';
import { evidenceUrl, uploadEvidence } from '@/lib/api';
import { useAction } from '@/lib/hooks';
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
  const act = useAction();
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div>
        {b.evidence.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {b.evidence.map((e) => (
              <li key={e.id} className="rounded-panel border border-paper-line bg-white p-3">
                <Thumb e={e} />
                <p className="mt-2 text-sm font-bold">{e.caption || e.file_name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-ink-mute"><span>{fmtDate(e.created_at)}</span>{e.exif_stripped && <Badge tone="leaf">Location removed</Badge>}{e.contains_people && <Badge tone="clay">Shows people</Badge>}</div>
              </li>
            ))}
          </ul>
        ) : <Empty title="No evidence yet">Photos of bins, scales, log sheets and sites raise a measurement to tier T1.</Empty>}
      </div>
      {canEdit && (
        <Panel title="Add evidence">
          <div className="space-y-4">
            <Notice tone="sky">Photograph the bins, the scale or the log sheet, not people. Location data is removed from every photo when it uploads.</Notice>
            <Field label="Photo" id="ev-f"><Input id="ev-f" type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
            <Field label="Caption" id="ev-c"><Input id="ev-c" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="For example: compost sample, week 6" /></Field>
            <Checkbox checked={people} onChange={setPeople} label="This photo shows identifiable people" />
            {people && <Checkbox checked={consent} onChange={setConsent} label="Every person shown has guardian consent for photos" hint="Your faculty liaison can check consent under My School." />}
            <ErrorNote>{act.error}</ErrorNote>
            <Button busy={act.busy} disabled={!file} onClick={() => act.run(async () => { await uploadEvidence(b.project.org_id, b.project.id, file!, caption, people, consent); setFile(null); setCaption(''); setPeople(false); setConsent(false); onChange(); })}><Upload className="h-4 w-4" /> Upload</Button>
          </div>
        </Panel>
      )}
    </div>
  );
}

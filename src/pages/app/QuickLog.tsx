import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, WifiOff } from 'lucide-react';
import { addMeasurement, uploadEvidence } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { loadSchool } from '@/lib/bundle';
import { metricByCode } from '@/lib/ekoa';
import { computeValue, formatMetric } from '@/lib/metrics';
import { enqueue, flush, queued } from '@/lib/offline';
import type { RoleKey } from '@/lib/types';
import { Button, Checkbox, Empty, ErrorNote, Field, Input, Loading, Notice, PageHeader, Panel, Select } from '@/components/ui';

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function QuickLog() {
  const auth = useAuth();
  const [params] = useSearchParams();
  const { data } = useData(() => loadSchool(auth.activeOrg!.id), [auth.activeOrg?.id]);
  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [code, setCode] = useState('');
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [end, setEnd] = useState(iso(new Date()));
  const [start, setStart] = useState(iso(new Date(Date.now() - 6 * 86_400_000)));
  const [baseline, setBaseline] = useState(false);
  const [checked, setChecked] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(queued());
  const act = useAction();
  const isLiaison = auth.has('faculty_liaison');

  useEffect(() => {
    const go = () => void flush().then(() => setPending(queued()));
    go();
    window.addEventListener('online', go);
    return () => window.removeEventListener('online', go);
  }, []);

  const projects = useMemo(() => (data?.projects ?? []).filter((p) => p.status === 'active' && data!.targets.some((t) => t.project_id === p.id)), [data]);
  useEffect(() => {
    if (!projectId && projects[0]) setProjectId(projects[0].id);
  }, [projects, projectId]);
  const codes = (data?.targets ?? []).filter((t) => t.project_id === projectId).map((t) => t.metric_code);
  useEffect(() => {
    if (codes.length && !codes.includes(code)) setCode(codes[0]);
  }, [codes, code]);

  if (!data) return <Loading />;
  if (!projects.length) return <Empty title="No project is ready for measurements">Add metrics to a project in its Plan tab first.</Empty>;

  const def = metricByCode(code);
  const nums = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Number(v)]));
  const complete = def ? def.inputs.every((i) => raw[i.key] !== undefined && raw[i.key] !== '' && !Number.isNaN(Number(raw[i.key]))) : false;
  const value = complete && def ? computeValue(def.code, nums, data.org) : null;
  const myRole = (auth.roles.find((r) => r.org_id === data.org.id && r.status === 'active')?.role ?? 'implementation_team') as RoleKey;

  const save = () =>
    act.run(async () => {
      if (value === null || !def) throw new Error('Fill in every number to calculate the value.');
      const row = {
        project_id: projectId, metric_code: def.code, value: Math.round(value * 10) / 10, raw: nums, period_start: start, period_end: end,
        is_baseline: baseline, method: baseline ? 'Baseline audit, library protocol v1' : `Library protocol v${def.version}`, entered_by: auth.person!.id,
        entered_role: myRole, tier: (isLiaison && checked ? 2 : photo ? 1 : 0) as 0 | 1 | 2, evidence_id: null, replaces_id: null,
      };
      if (!navigator.onLine) {
        enqueue(row);
        setPending(queued());
        setSaved('Saved on this device. It uploads when you are back online.');
      } else {
        let evidence_id: string | null = null;
        if (photo) evidence_id = (await uploadEvidence(data.org.id, projectId, photo, `${def.name}, week ending ${end}`, false, false)).id;
        await addMeasurement({ ...row, evidence_id });
        setSaved(`Saved: ${def.name} ${formatMetric(def.code, row.value)}.`);
      }
      setRaw({});
      setPhoto(null);
      setBaseline(false);
      setChecked(false);
    });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Log a measurement" lead="One screen, under a minute. Follow the protocol so your numbers compare with other schools." />
      {pending > 0 && <div className="mb-4"><Notice tone="clay"><span className="inline-flex items-center gap-2"><WifiOff className="h-4 w-4" /> {pending} {pending === 1 ? 'entry is' : 'entries are'} waiting to upload.</span></Notice></div>}
      {saved && <div className="mb-4"><Notice tone="leaf"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {saved} <Link to={`/app/projects/${projectId}?tab=measures`} className="font-bold underline">See the chart</Link></span></Notice></div>}
      <Panel>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project" id="ql-p"><Select id="ql-p" value={projectId} onChange={(e) => { setProjectId(e.target.value); setRaw({}); setSaved(null); }}>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
            <Field label="Metric" id="ql-m"><Select id="ql-m" value={code} onChange={(e) => { setCode(e.target.value); setRaw({}); setSaved(null); }}>{codes.map((c) => <option key={c} value={c}>{metricByCode(c)?.name}</option>)}</Select></Field>
          </div>
          {def && (
            <>
              <details className="rounded-field bg-paper px-4 py-3 text-sm">
                <summary className="cursor-pointer font-bold">How to measure: {def.frequency.toLowerCase()}</summary>
                <p className="mt-2 text-ink-soft">{def.protocol}</p>
                <p className="mt-1 text-ink-mute">{def.comparability_notes}</p>
              </details>
              <div className="grid gap-4 sm:grid-cols-2">
                {def.inputs.map((i) => (
                  <Field key={i.key} label={`${i.label} (${i.unit})`} id={`ql-${i.key}`}>
                    <Input id={`ql-${i.key}`} inputMode="decimal" value={raw[i.key] ?? ''} onChange={(e) => setRaw({ ...raw, [i.key]: e.target.value.replace(',', '.') })} className="text-lg" />
                  </Field>
                ))}
              </div>
              <div className="rounded-field border border-paper-line bg-paper px-4 py-3" aria-live="polite">
                <p className="text-sm text-ink-mute">{def.name}</p>
                <p className="font-display text-3xl font-bold tabular-nums">{value === null ? '—' : formatMetric(def.code, value)} <span className="text-base font-normal text-ink-mute">{def.unit}</span></p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Period start" id="ql-s"><Input id="ql-s" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
                <Field label="Period end" id="ql-e"><Input id="ql-e" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
              </div>
              <Field label="Photo of the log sheet or scale (optional)" id="ql-ph" hint="Adds evidence and raises the entry to tier T1. Bins and scales, not people.">
                <Input id="ql-ph" type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              </Field>
              <Checkbox checked={baseline} onChange={setBaseline} label="This is a baseline measurement" hint="Baselines are taken before any change, over at least 5 school days." />
              {isLiaison && <Checkbox checked={checked} onChange={setChecked} label="I checked these numbers against the source (records as T2)" />}
              <ErrorNote>{act.error}</ErrorNote>
              <Button variant="dark" size="lg" className="w-full" busy={act.busy} disabled={value === null} onClick={save}>Save measurement</Button>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}

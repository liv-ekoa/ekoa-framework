import { useState } from 'react';
import { CheckCircle2, Circle, Lock, PenLine } from 'lucide-react';
import { signGate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { canSign, evaluateGate } from '@/lib/gates';
import { ROLES, STAGES } from '@/lib/ekoa';
import { fmtDate } from '@/lib/format';
import type { ProjectBundle } from '@/lib/bundle';
import type { StageKey } from '@/lib/types';
import { Button, Checkbox, ErrorNote, cx } from '@/components/ui';

export function GatePanel({ b, stage, onChange, people }: { b: ProjectBundle; stage: StageKey; onChange: () => void; people: Record<string, string> }) {
  const auth = useAuth();
  const def = STAGES.find((s) => s.key === stage)!;
  const signed = b.gates.find((g) => g.stage === stage && g.signed_at);
  const [manual, setManual] = useState<Record<string, boolean>>(signed?.checklist ?? {});
  const checks = evaluateGate(stage, b, manual);
  const allOk = checks.every((c) => c.ok);
  const ci = STAGES.findIndex((s) => s.key === b.project.stage);
  const si = STAGES.findIndex((s) => s.key === stage);
  const isCurrent = si === ci;
  const future = si > ci;
  const mayActOnProject = b.project.status === 'active';
  const allowed = canSign(stage, auth.has, b.project.org_id);
  const act = useAction();

  return (
    <section className="rounded-panel border border-paper-line bg-white p-5 sm:p-6" aria-label={`${def.name} gate`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-mute">Stage {def.n} gate</p>
          <h2 className="text-xl font-semibold">{def.name}: {def.does.toLowerCase()}</h2>
          <p className="mt-1 text-sm text-ink-soft">Leaves behind: {def.captures.toLowerCase()}.</p>
        </div>
        {signed ? (
          <p className="flex items-center gap-2 rounded-field bg-leaf-50 px-3 py-2 text-sm font-bold text-leaf-600">
            <CheckCircle2 className="h-4 w-4" /> Signed by {people[signed.signed_by ?? ''] ?? 'a team member'} on {fmtDate(signed.signed_at)}
          </p>
        ) : future ? (
          <p className="flex items-center gap-2 text-sm text-ink-mute"><Lock className="h-4 w-4" /> Opens after stage {ci + 1}</p>
        ) : null}
      </div>

      <ul className="mt-5 space-y-2.5">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-3">
            {c.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf" aria-label="done" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink-mute/60" aria-label="not yet" />}
            <div className="flex-1">
              <p className={cx('text-base', c.ok ? 'text-ink' : 'text-ink-soft')}>{c.label}</p>
              {!c.ok && !signed && !future && <p className="text-xs text-ink-mute">{c.hint}</p>}
              {c.manualAllowed && !signed && !future && isCurrent && b.obstacles.length === 0 && (
                <div className="mt-1.5"><Checkbox checked={!!manual[c.key]} onChange={(v) => setManual({ ...manual, [c.key]: v })} label="No obstacles to report" /></div>
              )}
            </div>
            {c.auto && c.key !== 'obstacles' && <span className="text-xs text-ink-mute">Checked by the platform</span>}
          </li>
        ))}
      </ul>

      {isCurrent && !signed && def.signer !== 'automatic' && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-paper-line pt-5">
          <Button
            variant="dark"
            disabled={!allOk || !allowed || !mayActOnProject}
            busy={act.busy}
            onClick={() => act.run(async () => { await signGate(b.project, stage, auth.person!.id, manual); onChange(); })}
          >
            <PenLine className="h-4 w-4" /> Sign the {def.name} gate
          </Button>
          <p className="text-sm text-ink-mute">
            {!mayActOnProject
              ? `The project is ${b.project.status}. Resume it to sign gates.`
              : !allowed
                ? def.signer === 'faculty_liaison' ? 'Signed by the Faculty Liaison.' : `Signed by the ${ROLES[def.signer].label} or the Faculty Liaison.`
                : !allOk
                  ? `${checks.filter((c) => !c.ok).length} ${checks.filter((c) => !c.ok).length === 1 ? 'item' : 'items'} left before this gate can be signed.`
                  : 'Everything is in place. Signing moves the project to the next stage.'}
          </p>
          <ErrorNote>{act.error}</ErrorNote>
        </div>
      )}
      {isCurrent && def.signer === 'automatic' && (
        <p className="mt-5 border-t border-paper-line pt-4 text-sm text-ink-soft">This stage runs continuously. Every school that adapts the record appears in its lineage.</p>
      )}
    </section>
  );
}

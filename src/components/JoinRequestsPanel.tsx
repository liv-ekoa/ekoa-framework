import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { decideJoinRequest, pendingJoinRequests } from '@/lib/api';
import { useAction, useData } from '@/lib/hooks';
import { Button, ErrorNote, Panel } from './ui';
import type { Organisation } from '@/lib/types';

/** Teachers confirm students who asked to join, and share the school's join code. */
export function JoinRequestsPanel({ org }: { org: Organisation }) {
  const { data, reload } = useData(() => pendingJoinRequests(org.id), [org.id]);
  const act = useAction();
  const [copied, setCopied] = useState(false);
  const rows = data ?? [];
  return (
    <Panel title="Students asking to join">
      {org.join_code && (
        <p className="mb-3 text-sm text-ink-soft">
          Your school’s join code is <strong className="font-mono text-ink">{org.join_code}</strong>. Students can enter it when they sign up.{' '}
          <button className="inline-flex items-center gap-1 font-bold underline" onClick={() => { void navigator.clipboard?.writeText(org.join_code!); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </button>
        </p>
      )}
      {rows.length === 0 ? <p className="text-sm text-ink-mute">No one is waiting.</p> : (
        <ul className="divide-y divide-paper-line text-sm">
          {rows.map((r) => (
            <li key={r.request_id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <span><span className="font-bold">{r.display_name}</span> <span className="text-ink-mute">age {r.age_band}</span></span>
              <span className="flex gap-2">
                <Button size="sm" variant="dark" busy={act.busy} onClick={() => act.run(async () => { await decideJoinRequest(r.request_id, true); reload(); })}>Confirm</Button>
                <Button size="sm" variant="ghost" busy={act.busy} onClick={() => act.run(async () => { await decideJoinRequest(r.request_id, false); reload(); })}>Decline</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <ErrorNote>{act.error}</ErrorNote>
    </Panel>
  );
}

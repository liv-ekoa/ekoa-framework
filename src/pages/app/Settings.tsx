import { Download } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { download } from '@/lib/csv';
import { roleTitle } from '@/lib/ekoa';
import { fmtDate } from '@/lib/format';
import { Badge, Button, ErrorNote, KeyValue, Loading, Notice, PageHeader, Panel } from '@/components/ui';

export default function Settings() {
  const auth = useAuth();
  const p = auth.person!;
  const { data } = useData(async () => {
    const [consents, ms, posts] = await Promise.all([api.listConsents(), api.listMeasurements(), api.listPosts()]);
    return { consent: consents.find((c) => c.person_id === p.id) ?? null, ms: ms.filter((m) => m.entered_by === p.id), posts: posts.filter((x) => x.person_id === p.id) };
  }, [p.id]);
  const act = useAction();
  if (!data) return <Loading />;
  const c = data.consent;
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Your account">
          <KeyValue items={[
            ['Name', p.display_name],
            ['Email', p.email],
            ['Age band', p.age_band],
            ['Roles', auth.roles.map((r) => `${roleTitle(r)}${r.status !== 'active' ? ` (${r.status})` : ''}`).join(', ')],
          ]} />
          <p className="mt-4 text-sm text-ink-mute">To change your name or email, ask your faculty liaison. We never store your date of birth.</p>
        </Panel>
        {p.is_minor && (
          <Panel title="What your guardian allowed">
            {c?.granted_at ? (
              <>
                <ul className="space-y-2 text-sm">
                  {([['account', 'Account'], ['cross_school', 'Circles with other schools'], ['photos', 'Photos where you can be identified'], ['name_on_records', 'Your name on published records']] as const).map(([k, l]) => (
                    <li key={k} className="flex justify-between gap-3"><span>{l}</span>{c.scope[k] ? <Badge tone="leaf">Allowed</Badge> : <Badge>Not allowed</Badge>}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink-mute">Recorded {fmtDate(c.granted_at)}. Your guardian can change this at any time through the school.</p>
                <Button size="sm" variant="danger" className="mt-4" busy={act.busy} onClick={() => act.run(async () => { await api.withdrawConsent(); await auth.refresh(); })}>Withdraw consent and pause my account</Button>
              </>
            ) : <Notice tone="clay">Consent has not been recorded yet.</Notice>}
          </Panel>
        )}
        <Panel title="Your data">
          <p className="text-sm text-ink-soft">Download everything you have added: {data.ms.length} measurements and {data.posts.length} posts.</p>
          <Button variant="ghost" className="mt-3" onClick={() => download(`my-ekoa-data.json`, JSON.stringify({ person: p, roles: auth.roles, measurements: data.ms, posts: data.posts, consent: c }, null, 2), 'application/json')}><Download className="h-4 w-4" /> Download my data</Button>
          <p className="mt-3 text-xs text-ink-mute">When you leave your school, your personal data is deleted or anonymised unless you choose to stay on as alumni.</p>
        </Panel>
      </div>
      <ErrorNote>{act.error}</ErrorNote>
    </div>
  );
}

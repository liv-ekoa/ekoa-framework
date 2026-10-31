import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FilePlus2 } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { loadSchool } from '@/lib/bundle';
import { FX_TO_USD } from '@/lib/ekoa';
import { fmtDate } from '@/lib/format';
import { ProposalTimeline } from './project/ApprovalsTab';
import { Badge, Button, Empty, ErrorNote, Loading, PageHeader, Panel, Tabs } from '@/components/ui';

type Tab = 'proposals' | 'policies' | 'clauses' | 'budgets';

export default function Governance() {
  const auth = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'proposals';
  const orgId = auth.activeOrg!.id;
  const { data, reload } = useData(async () => {
    const [s, policies, clauses, amendments, budgets] = await Promise.all([loadSchool(orgId), api.listPolicies(), api.listClauses(), api.listAmendments(), api.listBudgets()]);
    return { s, policies: policies.filter((p) => p.org_id === orgId), clauses, amendments, budgets };
  }, [orgId]);
  const act = useAction();
  if (!data) return <Loading />;
  const { s } = data;
  const canDecide = auth.has(['approver', 'faculty_liaison']);
  const canDraft = auth.isSteward || auth.has(['project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'faculty_liaison']);
  const pending = s.proposals.filter((p) => p.decision === 'pending');
  const myAmendments = data.amendments.filter((a) => data.policies.some((p) => p.id === a.policy_id));

  return (
    <div>
      <PageHeader title="Governance" lead="Schools are micro-governments. Track every proposal through the approval chain, and write the policy that makes the work last." />
      <Tabs label="Governance sections" value={tab} onChange={(k) => setParams({ tab: k })} tabs={[{ key: 'proposals', label: 'Proposals', count: pending.length }, { key: 'policies', label: 'School policy', count: data.policies.length }, { key: 'clauses', label: 'Clause library' }, { key: 'budgets', label: 'Budget pathways' }]} />

      {tab === 'proposals' && (
        <div className="space-y-4">
          {s.proposals.length ? s.proposals.map((p) => (
            <div key={p.id}>
              <p className="mb-1.5 text-sm text-ink-mute">Project: <Link to={`/app/projects/${p.project_id}?tab=approvals`} className="font-bold text-leaf-600 hover:underline">{s.projects.find((x) => x.id === p.project_id)?.title}</Link></p>
              <ProposalTimeline b={{ steps: s.steps, events: s.events }} p={p} canDecide={canDecide} onChange={reload} />
            </div>
          )) : <Empty title="No proposals yet">Proposals are submitted from a project’s Approvals tab.</Empty>}
        </div>
      )}

      {tab === 'policies' && (
        <div className="space-y-4">
          {canDraft && (
            <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => {
              const base = data.clauses.slice(0, 10);
              const p = await api.savePolicy({ org_id: orgId, title: 'School Sustainability & Continuity Policy', status: 'draft', sections: base.map((c) => ({ key: `${c.section}-${c.id.slice(-4)}`, title: c.title, body: c.body, clause_id: c.id })) });
              nav(`/app/governance/policy/${p.id}`);
            })}><FilePlus2 className="h-4 w-4" /> Start a policy from the Ekoa template</Button>
          )}
          <ErrorNote>{act.error}</ErrorNote>
          {data.policies.length ? data.policies.map((p) => (
            <Link key={p.id} to={`/app/governance/policy/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-paper-line bg-white p-5 hover:border-ink/40">
              <span><span className="font-display text-lg font-semibold">{p.title}</span><span className="block text-sm text-ink-mute">Version {p.version}. {p.sections.length} sections. Updated {fmtDate(p.updated_at)}.</span></span>
              <Badge tone={p.status === 'adopted' || p.status === 'amended' ? 'leaf' : p.status === 'approved' ? 'sky' : 'clay'}>{p.status.replace('_', ' ')}</Badge>
            </Link>
          )) : <Empty title="No policy yet">The template is based on the School Sustainability and Continuity Policy written for the first collaborating school.</Empty>}
          {myAmendments.length > 0 && (
            <Panel title="Policy amendments adopted">
              <ul className="space-y-2 text-sm">{myAmendments.map((a) => <li key={a.id} className="flex justify-between gap-3"><span>{a.summary}</span><span className="text-ink-mute">{fmtDate(a.adopted_on)}</span></li>)}</ul>
            </Panel>
          )}
        </div>
      )}

      {tab === 'clauses' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.clauses.map((c) => (
            <article key={c.id} className="rounded-panel border border-paper-line bg-white p-5">
              <div className="flex items-start justify-between gap-3"><h2 className="font-display text-lg font-semibold">{c.title}</h2><Badge tone="leaf">Adopted by {c.adoption_count}</Badge></div>
              <p className="mt-1 text-xs text-ink-mute">Section: {c.section.replace('_', ' ')}</p>
              <p className="mt-3 text-sm text-ink-soft">{c.body}</p>
            </article>
          ))}
        </div>
      )}

      {tab === 'budgets' && (
        <Panel title="Where the money comes from">
          {s.projects.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-ink-mute"><tr><th className="py-2 pr-3 font-bold">Project</th><th className="py-2 pr-3 font-bold">Source</th><th className="py-2 pr-3 font-bold">Amount</th><th className="py-2 pr-3 font-bold">Status</th><th className="py-2 font-bold">Rigidities</th></tr></thead>
                <tbody>
                  {data.budgets.filter((b) => s.projects.some((p) => p.id === b.project_id)).map((b) => (
                    <tr key={b.id} className="border-t border-paper-line align-top">
                      <td className="py-2.5 pr-3 font-bold">{s.projects.find((p) => p.id === b.project_id)?.title}</td>
                      <td className="py-2.5 pr-3">{b.source_type.replace('_', ' ')}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{b.currency} {b.amount.toLocaleString('en-GB')}<span className="block text-xs text-ink-mute">about USD {Math.round(b.amount * (FX_TO_USD[b.currency] ?? 1))}</span></td>
                      <td className="py-2.5 pr-3"><Badge tone={b.status === 'released' || b.status === 'approved' ? 'leaf' : b.status === 'refused' ? 'alert' : 'clay'}>{b.status}</Badge></td>
                      <td className="py-2.5 text-ink-soft">{b.rigidity_notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-ink-mute">No projects yet.</p>}
        </Panel>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Download, FileText, Printer, Search } from 'lucide-react';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useData } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';
import { AREA_LABEL, areaOf, type Area } from '@/lib/modelPolicies';
import { allPolicies } from '@/lib/policyLibrary';
import { PolicyCard } from './PolicyCard';
import type { PublicPolicy } from '@/lib/types';
import { Badge, Button, Empty, ErrorNote, Input, Loading, Notice, Select, cx } from './ui';

/** Every adopted policy in the network. Updates itself: a policy
 *  appears here the moment its school adopts it, and amendments show straight away. */
export function PolicyLibrary({ hrefBase }: { hrefBase: string }) {
  const { data, error } = useData(async () => {
    const [full, shared] = await Promise.all([api.listPublicPolicies(), api.listSharedPolicyLinks().catch(() => [])]);
    return { full, links: allPolicies(shared) };
  });
  const [q, setQ] = useState('');
  const [area, setArea] = useState<Area | ''>('');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.full ?? [])
      .map((p) => ({ p, area: areaOf(p) }))
      .filter(({ p, area: a }) =>
        (!area || a === area) &&
        (!needle || `${p.title} ${p.school} ${p.country} ${p.sections.map((s) => `${s.title} ${s.body}`).join(' ')}`.toLowerCase().includes(needle)))
      .sort((a, b) => b.p.updated_at.localeCompare(a.p.updated_at));
  }, [data, q, area]);
  const links = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.links ?? []).filter((l) =>
      (!area || areaOf({ title: `${l.topic} ${l.title}`, sections: [{ title: l.category, body: l.summary }] }) === area) &&
      (!needle || `${l.title} ${l.school} ${l.topic} ${l.summary}`.toLowerCase().includes(needle)));
  }, [data, q, area]);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  return (
    <div>
      <div className="no-print grid gap-3 sm:grid-cols-[1fr_14rem]">
        <label className="relative block">
          <span className="sr-only">Search policies</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" aria-hidden />
          <Input className="pl-9" placeholder="Search: compost, solar, canteen…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Select aria-label="Area" value={area} onChange={(e) => setArea(e.target.value as Area | '')}>
          <option value="">Every area</option>
          {(Object.keys(AREA_LABEL) as Area[]).map((a) => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
        </Select>
      </div>
      <p className="mt-3 text-sm text-ink-mute">{list.length + links.length} {list.length + links.length === 1 ? 'policy' : 'policies'}. A school’s policy appears here as soon as the school adopts it.</p>
      {!data.full.length && data.links.length ? null : !data.full.length ? <div className="mt-6"><Empty title="The first policies are on their way">Schools’ adopted sustainability policies appear here as soon as they are added.</Empty></div> : list.length ? (
        <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map(({ p, area: a }) => (
            <li key={p.id}>
              <Link to={`${hrefBase}/${p.id}`} className="flex h-full flex-col rounded-panel border border-paper-line bg-white p-5 hover:border-ink/40">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={p.is_model ? 'clay' : 'leaf'}>{p.is_model ? 'Ekoa model' : 'Adopted'}</Badge>
                  <Badge>{AREA_LABEL[a]}</Badge>
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold leading-snug">{p.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{p.is_model ? 'A starting policy any school can copy' : [p.school, p.city, p.country].filter(Boolean).join(', ')}</p>
                <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{p.sections[0]?.body}</p>
                <p className="mt-auto pt-4 text-xs text-ink-mute">{p.sections.length} sections. Version {p.version}, updated {fmtDate(p.updated_at)}.</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : <div className="mt-6"><Empty title="No policies match">Try another word or area.</Empty></div>}
      {links.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">On schools’ own websites</h2>
          <p className="mt-1 text-sm text-ink-soft">Policies published by schools elsewhere, summarised in our words, with a link to the full original.</p>
          <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {links.map((l) => <li key={`${l.url}-${l.title}`}><PolicyCard p={l} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
function downloadWord(p: PublicPolicy) {
  const html = `<html><head><meta charset="utf-8"><title>${esc(p.title)}</title></head><body style="font-family:Georgia,serif">
<p style="color:#666">${esc(p.is_model ? 'Ekoa model policy' : p.school)}. Version ${p.version}.</p><h1>${esc(p.title)}</h1>
${p.sections.map((s) => `<h2>${esc(s.title)}</h2><p>${esc(s.body)}</p>`).join('')}</body></html>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'application/msword' }));
  a.download = `${p.title.replace(/[^\w ]+/g, '').trim() || 'policy'}.doc`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** One policy, readable by anyone. Members can copy it to their own school as a draft. */
export function PolicyDetail({ id, backTo }: { id: string; backTo: string }) {
  const auth = useAuth();
  const nav = useNavigate();
  const act = useAction();
  const { data: p, error } = useData(() => api.getPublicPolicy(id), [id]);
  if (error) return <div className="mx-auto max-w-3xl"><Empty title="This policy is not in the library">It may have been withdrawn by its school.</Empty></div>;
  if (!p) return <Loading />;
  const org = auth.activeOrg;
  const canCopy = !!org && org.id !== p.org_id && (auth.isSteward || auth.has(['project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'faculty_liaison'], org.id));
  return (
    <article className="mx-auto max-w-3xl">
      <Link to={backTo} className="no-print inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden /> All policies</Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={p.is_model ? 'clay' : 'leaf'}>{p.is_model ? 'Ekoa model policy' : p.status === 'amended' ? 'Adopted and amended' : 'Adopted'}</Badge>
        <Badge>{AREA_LABEL[areaOf(p)]}</Badge>
      </div>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{p.title}</h1>
      <p className="mt-2 text-ink-soft">{p.is_model ? 'Written by the Ekoa team as a starting point. Copy it, then change it to fit your school.' : [p.school, p.city, p.country].filter(Boolean).join(', ')}</p>
      <p className="mt-1 text-sm text-ink-mute">Version {p.version}{p.adopted_at ? `, adopted ${fmtDate(p.adopted_at)}` : ''}, last updated {fmtDate(p.updated_at)}.</p>
      <div className="no-print mt-5 flex flex-wrap gap-2">
        {canCopy && (
          <Button variant="dark" busy={act.busy} onClick={() => act.run(async () => { const copy = await api.copyPolicy(p, org!.id); nav(`/app/governance/policy/${copy.id}`); })}>
            <Copy className="h-4 w-4" aria-hidden /> Use this policy at {org!.name}
          </Button>
        )}
        <Button variant="ghost" onClick={() => downloadWord(p)}><Download className="h-4 w-4" aria-hidden /> Word document</Button>
        <Button variant="quiet" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Print or save as PDF</Button>
      </div>
      <ErrorNote>{act.error}</ErrorNote>
      {!auth.person && <div className="no-print mt-5"><Notice tone="sky">Want this for your school? <Link to="/join" className="font-bold underline">Join Ekoa</Link> and you can copy any policy here as your own draft, then adopt it with your school’s approval.</Notice></div>}
      <ol className="mt-8 space-y-6">
        {p.sections.map((s, i) => (
          <li key={s.key + i} className="border-t border-paper-line pt-5">
            <h2 className="flex items-baseline gap-3 text-xl font-semibold"><span className="text-sm text-ink-mute tabular-nums">{i + 1}</span>{s.title}</h2>
            <p className={cx('mt-2 whitespace-pre-line text-ink')}>{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-10 flex items-center gap-2 text-xs text-ink-mute"><FileText className="h-4 w-4" aria-hidden /> Published in the Ekoa Policy library because the school adopted it. Any amendment the school adopts appears here at once.</p>
    </article>
  );
}

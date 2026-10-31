// The Connections graph: who and what a school is linked to, in the style of the
// Villars "My Connections" view. Only school-level facts appear across schools.
// People appear only for your own school, and only to members of that school.

import type {
  Adaptation, Circle, CircleMember, Cohort, CohortMember, ImplementationRecord, Organisation, Person, Post,
  RoleAssignment, Thread, UUID, Verification,
} from './types';
import { roleTitle } from './ekoa';

export type NodeKind = 'school' | 'country' | 'circle' | 'hub' | 'partner' | 'project' | 'person';

export interface GNode {
  id: string;
  kind: NodeKind;
  label: string;
  sub?: string;
  /** Link to open the thing itself, if there is a page for it. */
  href?: string;
  audit?: boolean;
  mine?: boolean;
}
/** An edge reads "a label b", e.g. "record adapted by school". Seen from b it reads with `inverse`. */
export interface GEdge { a: string; b: string; label: string; inverse: string }

const INVERSE: Record<string, string> = {
  'located in': 'home to', 'member of': 'includes', 'active in': 'includes', 'mentors in': 'mentored by', 'possible collaborator': 'possible collaborator',
  published: 'published by', 'adapted by': 'adapted', 'audited by': 'audited', 'verified by': 'verified', 'helped by': 'helps',
  team: 'team', incoming: 'incoming', member: 'member',
};
/** The edge label as read from `from`. */
export const edgeLabel = (e: GEdge, from: string) => (e.a === from ? e.label : e.inverse);
export interface Graph { nodes: Map<string, GNode>; edges: GEdge[] }

export const KIND_META: Record<NodeKind, { label: string; plural: string }> = {
  school: { label: 'School', plural: 'Schools' },
  country: { label: 'Country', plural: 'Countries' },
  circle: { label: 'Circle', plural: 'Circles' },
  hub: { label: 'Hub', plural: 'Hubs' },
  partner: { label: 'Partner', plural: 'Partners' },
  project: { label: 'Project', plural: 'Projects' },
  person: { label: 'Person', plural: 'People (your school)' },
};

export interface GraphInput {
  myOrgId: UUID | null;
  orgs: Organisation[];
  cohorts: Cohort[];
  cohortMembers: CohortMember[];
  circles: Circle[];
  circleMembers: CircleMember[];
  myRoles: RoleAssignment[];
  people: Person[];
  /** Schools with similar policies (collaborator suggestions for your school). */
  collaborators: { org_id: UUID; score: number }[];
  records: ImplementationRecord[];
  adaptations: Adaptation[];
  verifications: Verification[];
  threads: Thread[];
  posts: Post[];
}

export function buildGraph(d: GraphInput): Graph {
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  const seen = new Set<string>();
  const node = (n: GNode) => { if (!nodes.has(n.id)) nodes.set(n.id, n); return n.id; };
  const edge = (a: string, b: string, label: string) => {
    const k = [a, b].sort().join('|') + label;
    if (a === b || seen.has(k)) return;
    seen.add(k);
    edges.push({ a, b, label, inverse: INVERSE[label] ?? label });
  };
  const orgNode = (o: Organisation) =>
    node(o.org_type === 'partner'
      ? { id: `o:${o.id}`, kind: 'partner', label: o.name, sub: [o.city, o.country].filter(Boolean).join(', ') }
      : { id: `o:${o.id}`, kind: 'school', label: o.name, sub: [o.city, o.country].filter(Boolean).join(', '), audit: o.audit_school, mine: o.id === d.myOrgId });
  const orgById = new Map(d.orgs.map((o) => [o.id, o]));
  const orgByName = new Map(d.orgs.map((o) => [o.name, o]));
  const visibleOrg = (o: Organisation | undefined): o is Organisation => !!o && o.org_type !== 'ekoa' && (o.public_visible || o.id === d.myOrgId);

  // Schools and partners, and the country each is located in.
  for (const o of d.orgs.filter(visibleOrg)) {
    const id = orgNode(o);
    if (o.country) edge(id, node({ id: `c:${o.country}`, kind: 'country', label: o.country }), 'located in');
  }
  // Hubs: the cohorts schools belong to.
  for (const c of d.cohorts) {
    const hid = node({ id: `h:${c.id}`, kind: 'hub', label: c.name, sub: 'Cohort' });
    for (const m of d.cohortMembers.filter((x) => x.cohort_id === c.id)) {
      const o = orgById.get(m.org_id);
      if (visibleOrg(o)) edge(orgNode(o), hid, 'member of');
    }
  }
  // Circles: a school is active in a circle if its members joined it or posted there.
  const circleNode = (c: Circle) => node({ id: `t:${c.id}`, kind: 'circle', label: c.name, sub: 'Circle', href: '/app/network' });
  const myPeople = new Set(d.myRoles.map((r) => r.person_id));
  for (const c of d.circles) {
    const cid = circleNode(c);
    if (d.myOrgId && d.circleMembers.some((m) => m.circle_id === c.id && myPeople.has(m.person_id))) {
      const mine = orgById.get(d.myOrgId);
      if (mine) edge(orgNode(mine), cid, 'active in');
    }
    const threadIds = new Set(d.threads.filter((t) => t.circle_id === c.id).map((t) => t.id));
    for (const p of d.posts.filter((x) => threadIds.has(x.thread_id) && !x.hidden)) {
      const o = orgByName.get(p.author_org);
      if (visibleOrg(o)) edge(orgNode(o), cid, o.org_type === 'partner' ? 'mentors in' : 'active in');
    }
  }
  // Possible collaborators: schools whose policies are like yours.
  const mine = d.myOrgId ? orgById.get(d.myOrgId) : undefined;
  for (const c of d.collaborators) {
    const other = orgById.get(c.org_id);
    if (mine && other && other.org_type === 'school') edge(orgNode(mine), orgNode(other), 'possible collaborator');
  }
  // Projects: published records (and your own drafts), who adapted them and who audited them.
  for (const r of d.records) {
    const o = orgById.get(r.org_id);
    const shareable = r.status === 'published' && !r.anonymised;
    if (!visibleOrg(o) || !(shareable || r.org_id === d.myOrgId)) continue;
    const rid = node({ id: `r:${r.id}`, kind: 'project', label: r.title, sub: r.status === 'published' ? `Tier T${r.tier}` : 'Draft', href: `/app/library/${r.id}` });
    edge(orgNode(o), rid, 'published');
    for (const a of d.adaptations.filter((x) => x.source_record_id === r.id && x.org_id)) {
      const by = orgById.get(a.org_id!);
      if (visibleOrg(by) && by.id !== r.org_id) edge(rid, orgNode(by), 'adapted by');
    }
    for (const v of d.verifications.filter((x) => x.record_id === r.id && x.status === 'verified' && x.verifier_org)) {
      const by = orgById.get(v.verifier_org!);
      if (visibleOrg(by)) edge(rid, orgNode(by), v.requested_tier === 3 ? 'audited by' : 'verified by');
    }
  }
  // Partners who help a school through a partner request.
  for (const t of d.threads.filter((x) => x.kind === 'partner_request' && x.org_id)) {
    const school = orgById.get(t.org_id!);
    for (const p of d.posts.filter((x) => x.thread_id === t.id)) {
      const o = orgByName.get(p.author_org);
      if (visibleOrg(school) && visibleOrg(o) && o.org_type === 'partner') edge(orgNode(school), orgNode(o), 'helped by');
    }
  }
  // People: only your own school's team, shown to members of that school.
  if (d.myOrgId) {
    const mine = orgById.get(d.myOrgId);
    for (const r of d.myRoles.filter((x) => x.org_id === d.myOrgId && x.status !== 'alumni')) {
      const p = d.people.find((x) => x.id === r.person_id);
      if (!p || !mine) continue;
      const pid = node({ id: `p:${p.id}`, kind: 'person', label: p.display_name, sub: roleTitle(r) });
      edge(pid, orgNode(mine), r.status === 'incoming' ? 'incoming' : 'team');
      for (const m of d.circleMembers.filter((x) => x.person_id === p.id)) {
        const c = d.circles.find((x) => x.id === m.circle_id);
        if (c) edge(pid, circleNode(c), 'member');
      }
    }
  }
  return { nodes, edges };
}

/** Breadth-first neighbourhood of `center` up to `depth`, keeping only visible kinds. */
export function neighbourhood(g: Graph, center: string, depth: number, kinds: Set<NodeKind>) {
  const keep = (id: string) => id === center || kinds.has(g.nodes.get(id)!.kind);
  const level = new Map<string, number>([[center, 0]]);
  const parent = new Map<string, string>();
  let frontier = [center];
  for (let d = 1; d <= depth; d++) {
    const next: string[] = [];
    for (const n of frontier) {
      for (const e of g.edges) {
        const other = e.a === n ? e.b : e.b === n ? e.a : null;
        if (!other || level.has(other) || !keep(other)) continue;
        level.set(other, d);
        parent.set(other, n);
        next.push(other);
      }
    }
    frontier = next;
  }
  const ids = new Set(level.keys());
  // Tree edges only, so the picture stays readable; the list view shows everything.
  const edges = g.edges.filter((e) => ids.has(e.a) && ids.has(e.b) && (parent.get(e.a) === e.b || parent.get(e.b) === e.a));
  return { level, parent, edges };
}

const KIND_ORDER: NodeKind[] = ['country', 'hub', 'circle', 'school', 'partner', 'project', 'person'];

/** Radial layout: rings by distance, children fanned inside their parent's sector.
 *  Rings are stretched sideways (`aspect`) to use a wide screen, and grow with the number of nodes. */
export function radialLayout(level: Map<string, number>, parent: Map<string, string>, g: Graph, rings = [0, 190, 330, 450], aspect = 1.6) {
  const pos = new Map<string, { x: number; y: number; angle: number }>();
  const byLevel = new Map<number, string[]>();
  for (const [id, l] of level) byLevel.set(l, [...(byLevel.get(l) ?? []), id]);
  const center = byLevel.get(0)![0];
  pos.set(center, { x: 0, y: 0, angle: 0 });
  const sector = new Map<string, [number, number]>();
  const n1 = (byLevel.get(1) ?? []).length;
  const grow = Math.max(1, n1 / 12);
  rings = rings.map((r) => r * grow);
  const at = (angle: number, r: number) => ({ x: Math.cos(angle) * r * aspect, y: Math.sin(angle) * r, angle });
  const first = (byLevel.get(1) ?? []).sort((a, b) => KIND_ORDER.indexOf(g.nodes.get(a)!.kind) - KIND_ORDER.indexOf(g.nodes.get(b)!.kind) || g.nodes.get(a)!.label.localeCompare(g.nodes.get(b)!.label));
  const step = (2 * Math.PI) / Math.max(1, first.length);
  first.forEach((id, i) => {
    const angle = -Math.PI / 2 + i * step;
    // With many neighbours, stagger alternate nodes so their labels don't collide.
    pos.set(id, at(angle, rings[1] * (n1 > 10 && i % 2 ? 1.14 : 1)));
    sector.set(id, [angle - step / 2, angle + step / 2]);
  });
  for (let l = 2; l < rings.length; l++) {
    const ids = byLevel.get(l) ?? [];
    const groups = new Map<string, string[]>();
    for (const id of ids) groups.set(parent.get(id)!, [...(groups.get(parent.get(id)!) ?? []), id]);
    for (const [p, kids] of groups) {
      const [a0, a1] = sector.get(p) ?? [0, 2 * Math.PI];
      const w = (a1 - a0) / kids.length;
      kids.forEach((id, i) => {
        const angle = a0 + w * (i + 0.5);
        const r = rings[l] + (kids.length > 3 ? (i % 2) * 34 : 0);
        pos.set(id, at(angle, r));
        sector.set(id, [a0 + w * i, a0 + w * (i + 1)]);
      });
    }
  }
  return pos;
}

// Demo mode: an in-browser stand-in for Supabase. It implements the small subset of
// the supabase-js query builder this app uses, so every page is written once against
// one API and runs either on a real Supabase project or on seeded demo data.

import { buildSeed } from './seed';
import { screen } from './moderation';

type Row = Record<string, any>;
type Tables = Record<string, Row[]>;
type Filter = (r: Row) => boolean;

const STORAGE_KEY = 'ekoa-demo-v10';

let tables: Tables | null = null;

function load(): Tables {
  if (tables) return tables;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      tables = JSON.parse(raw) as Tables;
      return tables;
    }
  } catch {
    /* storage blocked: fall back to memory */
  }
  tables = buildSeed();
  persist();
  return tables;
}

let persistTimer: number | undefined;
function persist() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
    } catch {
      /* quota or blocked: keep in memory only */
    }
  }, 50);
}

export function resetDemo() {
  tables = buildSeed();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  } catch {
    /* ignore */
  }
}

export const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

class Builder implements PromiseLike<{ data: any; error: { message: string } | null }> {
  private filters: Filter[] = [];
  private orderBy: { col: string; asc: boolean }[] = [];
  private lim: number | null = null;
  private mode: 'many' | 'single' | 'maybe' = 'many';
  private payload: Row | Row[] | null = null;
  private returning = false;

  constructor(private table: string, private op: Op = 'select') {}

  select(_cols?: string) {
    if (this.op !== 'select') this.returning = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = 'insert';
    this.payload = rows;
    return this;
  }
  upsert(rows: Row | Row[]) {
    this.op = 'upsert';
    this.payload = rows;
    return this;
  }
  update(patch: Row) {
    this.op = 'update';
    this.payload = patch;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(col: string, v: any) {
    this.filters.push((r) => r[col] === v);
    return this;
  }
  neq(col: string, v: any) {
    this.filters.push((r) => r[col] !== v);
    return this;
  }
  in(col: string, vs: any[]) {
    this.filters.push((r) => vs.includes(r[col]));
    return this;
  }
  gte(col: string, v: any) {
    this.filters.push((r) => r[col] >= v);
    return this;
  }
  lte(col: string, v: any) {
    this.filters.push((r) => r[col] <= v);
    return this;
  }
  is(col: string, v: null | boolean) {
    this.filters.push((r) => (v === null ? r[col] === null || r[col] === undefined : r[col] === v));
    return this;
  }
  ilike(col: string, pattern: string) {
    const needle = pattern.replace(/%/g, '').toLowerCase();
    this.filters.push((r) => String(r[col] ?? '').toLowerCase().includes(needle));
    return this;
  }
  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orderBy.push({ col, asc: opts.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.lim = n;
    return this;
  }
  single() {
    this.mode = 'single';
    return this;
  }
  maybeSingle() {
    this.mode = 'maybe';
    return this;
  }

  private run(): { data: any; error: { message: string } | null } {
    const db = load();
    const rows = (db[this.table] ??= []);
    const match = (r: Row) => this.filters.every((f) => f(r));
    let out: Row[] = [];

    if (this.op === 'select') {
      out = (VIEWS[this.table]?.(db) ?? rows).filter(match);
    } else if (this.op === 'insert' || this.op === 'upsert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const now = new Date().toISOString();
      for (const item of list) {
        const key = this.table === 'metric_definitions' ? 'code' : 'id';
        const existing = this.op === 'upsert' ? rows.find((r) => r[key] === item[key]) : undefined;
        if (existing) {
          Object.assign(existing, item);
          out.push(existing);
        } else {
          const row: Row = { id: uuid(), created_at: now, ...item };
          const err = BEFORE_INSERT[this.table]?.(row, db);
          if (err) return { data: null, error: { message: err } };
          rows.push(row);
          AFTER_INSERT[this.table]?.(row, db);
          out.push(row);
        }
      }
      persist();
    } else if (this.op === 'update') {
      out = rows.filter(match);
      for (const r of out) {
        const before = { ...r };
        Object.assign(r, this.payload);
        BEFORE_UPDATE[this.table]?.(r, before, db);
      }
      persist();
    } else if (this.op === 'delete') {
      out = rows.filter(match);
      db[this.table] = rows.filter((r) => !match(r));
      persist();
    }

    for (const o of [...this.orderBy].reverse()) {
      out = [...out].sort((a, b) => {
        const x = a[o.col];
        const y = b[o.col];
        if (x === y) return 0;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (x < y ? -1 : 1) * (o.asc ? 1 : -1);
      });
    }
    if (this.lim !== null) out = out.slice(0, this.lim);

    // Return deep copies so callers cannot mutate the store by accident.
    const copy = JSON.parse(JSON.stringify(out));
    if (this.op !== 'select' && !this.returning && this.mode === 'many') return { data: null, error: null };
    if (this.mode === 'single') {
      if (copy.length !== 1) return { data: null, error: { message: `Expected one row in ${this.table}, found ${copy.length}` } };
      return { data: copy[0], error: null };
    }
    if (this.mode === 'maybe') return { data: copy[0] ?? null, error: null };
    return { data: copy, error: null };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return new Promise<{ data: any; error: { message: string } | null }>((resolve) => {
      // Small delay so loading states behave like a real network.
      setTimeout(() => resolve(this.run()), 60);
    }).then(onfulfilled, onrejected);
  }
}

// ---------------- Stand-ins for the database's own rules ----------------
// The live site runs these as Postgres triggers and functions (supabase/migrations). The preview
// copies the parts the screens depend on, so a held post or a report behaves the same way here.

const SESSION_KEY = 'ekoa-demo-session';
let memSession: { id: string; email: string } | null = null;
function getSession(): { id: string; email: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : memSession;
  } catch {
    return memSession;
  }
}
function setSession(v: { id: string; email: string } | null) {
  memSession = v;
  try {
    if (v) localStorage.setItem(SESSION_KEY, JSON.stringify(v));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* memory only */
  }
}
const me = (db: Tables): Row | undefined => {
  const s = getSession();
  return s ? db.people?.find((p) => p.auth_user_id === s.id) : undefined;
};
const firstOrg = (db: Tables, personId: string | undefined) => db.role_assignments?.find((r) => r.person_id === personId && r.status !== 'alumni')?.org_id ?? null;
const isSteward = (db: Tables) => { const p = me(db); return !!p && (db.role_assignments ?? []).some((r) => r.person_id === p.id && r.role === 'steward' && r.status === 'active'); };
let filtering = false;
const now = () => new Date().toISOString();

function fileFlag(db: Tables, kind: string, target: Row, text: string) {
  const hit = screen(text);
  if (!hit) return;
  filtering = true;
  try {
    const row: Row = { id: uuid(), created_at: now(), target_kind: kind, target_id: target.id, reason: hit.reason, source: 'filter', reporter_person_id: null, note: '', status: 'open', decided_by: null, decided_at: null };
    BEFORE_INSERT.content_flags(row, db);
    (db.content_flags ??= []).push(row);
    AFTER_INSERT.content_flags(row, db);
  } finally {
    filtering = false;
  }
}

/** Same formula as the public_school_ranking view. */
const OUTCOME_POINTS: Record<string, number> = { worked: 10, partly: 6, did_not_work: 4, too_early: 0 };
function computeRanking(orgs: Row[], records: Row[], adaptations: Row[], projects: Row[]): Row[] {
  const eligible = (r: Row) => r.status === 'published' && r.visibility === 'public' && !r.anonymised && r.tier >= 2;
  const rows = orgs
    .filter((o) => o.org_type === 'school' && o.public_visible)
    .map((o) => {
      const recs = records.filter((r) => r.org_id === o.id && eligible(r));
      const points = recs.reduce((s, r) => s + (OUTCOME_POINTS[r.outcome_class] ?? 0) * (r.tier >= 3 ? 1.5 : 1), 0);
      const mine = new Set(records.filter((r) => r.org_id === o.id && r.status === 'published' && r.visibility === 'public' && !r.anonymised).map((r) => r.id));
      const ads = adaptations.filter((a) => mine.has(a.source_record_id)).map((a) => ({ a, org: a.org_id ?? projects.find((p) => p.id === a.project_id)?.org_id })).filter((x) => x.org && x.org !== o.id);
      const adopters = new Set(ads.map((x) => x.org)).size;
      const worked = ads.filter((x) => x.a.result === 'worked').length;
      return { org_id: o.id, name: o.name, country: o.country, city: o.city, verified_records: recs.length, audited_records: recs.filter((r) => r.tier >= 3).length, adopting_schools: adopters, adoptions_that_worked: worked, score: points + 8 * adopters + 4 * worked, position: 0 };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  rows.forEach((r, i) => { r.position = i > 0 && rows[i - 1].score === r.score ? rows[i - 1].position : i + 1; });
  return rows;
}

const VIEWS: Record<string, (db: Tables) => Row[]> = {
  public_policies: (db) => (db.policies ?? []).flatMap((p) => {
    const o = db.organisations?.find((x) => x.id === p.org_id);
    if (!o || !['adopted', 'amended'].includes(p.status) || !['school', 'ekoa'].includes(o.org_type)) return [];
    const model = o.org_type === 'ekoa';
    return [{ ...p, is_model: model, school: model ? 'Ekoa model policy' : o.public_visible ? o.name : o.anonymised_label || 'A school in the Ekoa network', org_id: !model && o.public_visible ? o.id : null, city: o.public_visible ? o.city : '', country: o.country }];
  }),
  public_records: (db) => (db.records ?? []).filter((r) => r.status === 'published' && r.visibility === 'public'),
  public_school_ranking: (db) => computeRanking(db.organisations ?? [], db.records ?? [], db.adaptations ?? [], db.projects ?? []),
};

const BEFORE_INSERT: Record<string, (row: Row, db: Tables) => string | void> = {
  posts: (row) => {
    const hit = screen(String(row.body ?? ''));
    row.flag_reason = hit?.reason ?? null;
    row.hidden = !!hit;
    row.flagged = !!hit;
  },
  evidence: (row) => {
    row.hidden = !!screen(String(row.caption ?? ''));
  },
  policy_links: (row, db) => {
    const p = me(db);
    if (!p) return 'Sign in first.';
    row.added_by = p.id;
    row.added_by_name = p.display_name;
    row.org_id = db.policies?.find((x) => x.id === row.policy_id)?.org_id ?? null;
    row.hidden = !!screen(`${row.title ?? ''} ${row.note ?? ''}`);
  },
  content_flags: (row, db) => {
    if (!filtering) {
      row.source = row.target_kind === 'upload' ? 'filter' : 'report';
      row.reporter_person_id = me(db)?.id ?? null;
      if (!row.reporter_person_id) return 'Sign in to report something.';
    }
    row.status = 'open';
    row.decided_by = null;
    row.decided_at = null;
    row.note = row.note ?? '';
    if (row.target_kind === 'post') {
      const post = db.posts?.find((x) => x.id === row.target_id);
      const thread = db.threads?.find((t) => t.id === post?.thread_id);
      row.org_id = firstOrg(db, post?.person_id) ?? thread?.org_id ?? null;
      row.excerpt = String(post?.body ?? '').slice(0, 280);
    } else if (row.target_kind === 'evidence') {
      const e = db.evidence?.find((x) => x.id === row.target_id);
      row.org_id = e?.org_id ?? null;
      row.excerpt = String(e?.caption || e?.file_name || '').slice(0, 280);
    } else if (row.target_kind === 'policy_link') {
      const l = db.policy_links?.find((x) => x.id === row.target_id);
      row.org_id = l?.org_id ?? null;
      row.excerpt = `${l?.title ?? ''} (${l?.url ?? ''})`.slice(0, 280);
    } else {
      row.org_id = firstOrg(db, row.reporter_person_id ?? me(db)?.id);
      row.excerpt = String(row.excerpt ?? '').slice(0, 280);
    }
  },
};

const AFTER_INSERT: Record<string, (row: Row, db: Tables) => void> = {
  posts: (row, db) => fileFlag(db, 'post', row, String(row.body ?? '')),
  evidence: (row, db) => fileFlag(db, 'evidence', row, String(row.caption ?? '')),
  policy_links: (row, db) => fileFlag(db, 'policy_link', row, `${row.title ?? ''} ${row.note ?? ''}`),
  content_flags: (row, db) => {
    const table = { post: 'posts', evidence: 'evidence', policy_link: 'policy_links' }[row.target_kind as string];
    const target = table ? db[table]?.find((x) => x.id === row.target_id) : undefined;
    if (target) { target.hidden = true; if (table === 'posts') target.flagged = true; }
    if (row.reason === 'self_harm' || row.reason === 'contact') {
      (db.safeguarding_reports ??= []).push({
        id: uuid(), created_at: now(), reporter_person_id: row.reporter_person_id, reporter_contact: row.source === 'filter' ? 'Automatic flag' : 'Reported by a member',
        subject_ref: `Flagged ${String(row.target_kind).replace('_', ' ')}`, category: row.reason === 'self_harm' ? 'wellbeing' : 'privacy',
        details: `Hidden because it looked like ${row.reason === 'self_harm' ? 'someone may be at risk' : 'it shared contact details'}: "${row.excerpt}"`,
        status: 'new', assigned_to: 'Ekoa safeguarding lead', actions: [{ at: now(), note: 'Hidden at once; the school’s faculty liaison was alerted.' }],
      });
    }
  },
};

let deciding = false;
const BEFORE_UPDATE: Record<string, (row: Row, before: Row, db: Tables) => void> = {
  content_flags: (row, before, db) => {
    for (const k of ['target_kind', 'target_id', 'org_id', 'reason', 'source', 'reporter_person_id', 'excerpt', 'created_at']) row[k] = before[k];
    if (row.status === before.status) return;
    row.decided_by = me(db)?.id ?? null;
    row.decided_at = now();
    const table = { post: 'posts', evidence: 'evidence', policy_link: 'policy_links' }[row.target_kind as string];
    const target = table ? db[table]?.find((x) => x.id === row.target_id) : undefined;
    if (target && row.status === 'removed') {
      if (table === 'posts') Object.assign(target, { body: '[Removed by a moderator]', hidden: false, flagged: true });
      else target.hidden = true;
    } else if (target && row.status === 'restored' && !(db.content_flags ?? []).some((f) => f.target_id === row.target_id && f.id !== row.id && f.status === 'open')) {
      target.hidden = false;
      if (table === 'posts') target.flagged = false;
    }
    if (!deciding) {
      deciding = true;
      for (const f of db.content_flags ?? []) if (f.target_id === row.target_id && f.id !== row.id && f.status === 'open') { const b = { ...f }; f.status = row.status; BEFORE_UPDATE.content_flags(f, b, db); }
      deciding = false;
    }
  },
};

// ---------------- Database functions (supabase.rpc) ----------------
const STOP = new Set('about after again along among being below could every their there these thing those through under until which while where would should other shall within without school schools student students project projects policy policies sustainability sustainable staff year years including ensure'.split(' '));
type Fail = { data: null; error: { message: string } };
const fail = (message: string): Fail => ({ data: null, error: { message } });

const RPC: Record<string, (args: Row, db: Tables) => { data: unknown; error: { message: string } | null }> = {
  consent_lookup: ({ p_token }, db) => {
    const rec = db.consent_records?.find((c) => c.token === p_token);
    const person = rec && db.people?.find((p) => p.id === rec.person_id);
    return { data: rec && person ? [{ first_name: String(person.display_name).split(' ')[0], scope: rec.scope, granted: !!rec.granted_at }] : [], error: null };
  },
  grant_consent: ({ p_token, p_guardian_name, p_scope }, db) => {
    const rec = db.consent_records?.find((c) => c.token === p_token);
    if (!rec) return fail('invalid token');
    Object.assign(rec, { guardian_name: p_guardian_name, scope: p_scope, granted_at: now(), withdrawn_at: null });
    const person = db.people?.find((p) => p.id === rec.person_id);
    if (person) person.consent_status = p_scope?.account ? 'granted' : 'pending';
    return { data: null, error: null };
  },
  withdraw_my_consent: (_a, db) => {
    const p = me(db);
    if (!p) return fail('Sign in first.');
    for (const c of db.consent_records ?? []) if (c.person_id === p.id) c.withdrawn_at = now();
    p.consent_status = 'withdrawn';
    return { data: null, error: null };
  },
  bump_clause_adoptions: ({ p_ids }, db) => {
    for (const c of db.policy_clauses ?? []) if ((p_ids as string[]).includes(c.id)) c.adoption_count = (c.adoption_count ?? 0) + 1;
    return { data: null, error: null };
  },
  complete_verification: ({ p_id, p_verified, p_notes }, db) => {
    const v = db.verifications?.find((x) => x.id === p_id);
    const p = me(db);
    if (!v || !p) return fail('Not found.');
    const mine = (db.role_assignments ?? []).filter((r) => r.person_id === p.id && (r.status === 'active' || r.status === 'outgoing'));
    const can = (roles: string[]) => mine.some((r) => r.org_id === v.verifier_org && roles.includes(r.role)) || mine.some((r) => r.role === 'steward');
    if (v.requested_tier === 3 && !can(['auditor', 'faculty_liaison'])) return fail('Only an auditor at the Ekoa audit school can complete a T3 peer audit.');
    if (v.requested_tier === 4 && !can(['partner', 'faculty_liaison'])) return fail('Only the partner organisation can complete T4 verification.');
    Object.assign(v, { status: p_verified ? 'verified' : 'declined', notes: p_notes });
    const rec = db.records?.find((r) => r.id === v.record_id);
    if (p_verified && rec) {
      rec.tier = Math.max(rec.tier, v.requested_tier);
      rec.outcomes = (rec.outcomes ?? []).map((o: Row) => ({ ...o, tier: Math.max(o.tier, v.requested_tier) }));
    }
    return { data: null, error: null };
  },
  collaborator_suggestions: ({ p_org }, db) => {
    const profile = (orgId: string) => {
      const secs = (db.policies ?? []).filter((p) => p.org_id === orgId).flatMap((p) => (p.sections ?? []) as Row[]);
      const words = new Set<string>();
      for (const s of secs) for (const w of `${s.title ?? ''} ${s.body ?? ''}`.toLowerCase().split(/[^a-z]+/)) if (w.length >= 5 && !STOP.has(w)) words.add(w);
      return { has: secs.length > 0, c: new Set(secs.map((s) => s.clause_id).filter(Boolean) as string[]), k: new Set(secs.map((s) => s.title || s.key) as string[]), w: words };
    };
    const inter = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x));
    const jac = (a: Set<string>, b: Set<string>) => { const u = new Set([...a, ...b]).size; return u ? inter(a, b).length / u : 0; };
    const mine = profile(p_org);
    if (!mine.has) return { data: [], error: null };
    const out = (db.organisations ?? []).filter((o) => o.id !== p_org).map((o) => {
      const other = profile(o.id);
      if (!other.has) return null;
      const score = Math.round((0.5 * jac(mine.c, other.c) + 0.2 * jac(mine.k, other.k) + 0.3 * jac(mine.w, other.w)) * 1000) / 1000;
      const clauses = inter(mine.c, other.c).map((id) => db.policy_clauses?.find((c) => c.id === id)?.title).filter(Boolean).sort();
      return { org_id: o.id, name: o.name, city: o.city, country: o.country, score, shared_clauses: clauses, shared_sections: inter(mine.k, other.k), shared_terms: inter(mine.w, other.w).sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, 8) };
    }).filter((x): x is NonNullable<typeof x> => !!x && x.score >= 0.15).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 8);
    return { data: out, error: null };
  },
  register_independent_student: ({ p_name, p_age_band, p_school, p_country, p_city, p_guardian_name, p_guardian_email }, db) => {
    const s = getSession();
    if (!s) return fail('Sign in first.');
    if (db.people?.some((p) => p.auth_user_id === s.id || String(p.email).toLowerCase() === s.email.toLowerCase())) return fail('This email already belongs to an Ekoa account. Ask your teacher or an Ekoa admin.');
    if (String(p_name ?? '').trim().length < 2) return fail('Add your name.');
    if (!['13-15', '16-17', '18+'].includes(p_age_band)) return fail('Choose your age group.');
    const minor = p_age_band !== '18+';
    if (minor && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p_guardian_email ?? '')) return fail('Students under 18 need a parent’s or guardian’s email.');
    const person = { id: uuid(), created_at: now(), auth_user_id: s.id, display_name: String(p_name).trim(), email: s.email.toLowerCase(), age_band: p_age_band, is_minor: minor, locale: 'en', consent_status: minor ? 'pending' : 'not_needed' };
    const org = { id: uuid(), created_at: now(), name: `${person.display_name} (independent)`, org_type: 'independent', country: p_country ?? '', city: p_city ?? '', school_name: p_school ?? '', status: 'active', public_visible: false, lat: null, lng: null, curriculum: null, student_count: null, grade_range: null, climate_zone: null, context_profile: null, anonymised_label: null };
    (db.people ??= []).push(person);
    (db.organisations ??= []).push(org);
    (db.role_assignments ??= []).push({ id: uuid(), created_at: now(), person_id: person.id, org_id: org.id, role: 'project_lead', status: 'active', local_title: 'Independent student', seat: null, term_start: now().slice(0, 10), term_end: null });
    if (minor) (db.consent_records ??= []).push({ id: uuid(), created_at: now(), person_id: person.id, guardian_name: p_guardian_name ?? '', guardian_email: String(p_guardian_email).toLowerCase(), scope: { account: false, cross_school: false, photos: false, name_on_records: false }, method: 'email_link', terms_version: '2026-10', token: uuid(), granted_at: null, withdrawn_at: null });
    return { data: person.id, error: null };
  },
  assign_student: ({ p_email, p_name, p_age_band, p_org, p_role, p_local_title, p_guardian_name, p_guardian_email, p_move_projects }, db) => {
    if (!isSteward(db)) return fail('Only Ekoa admins can assign roles here.');
    if (db.organisations?.find((o) => o.id === p_org)?.org_type !== 'school') return fail('Choose a school.');
    if (!['project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'auditor', 'alumni'].includes(p_role)) return fail('Choose a student role.');
    let person = db.people?.find((p) => String(p.email).toLowerCase() === String(p_email).trim().toLowerCase());
    if (!person) {
      if (String(p_name ?? '').trim().length < 2) return fail('Add the student’s name.');
      if (!['13-15', '16-17', '18+'].includes(p_age_band)) return fail('Choose the student’s age group.');
      const minor = p_age_band !== '18+';
      if (minor && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p_guardian_email ?? '')) return fail('Students under 18 need a parent’s or guardian’s email.');
      person = { id: uuid(), created_at: now(), auth_user_id: null, display_name: String(p_name).trim(), email: String(p_email).trim().toLowerCase(), age_band: p_age_band, is_minor: minor, locale: 'en', consent_status: minor ? 'pending' : 'not_needed' };
      db.people.push(person);
      if (minor) (db.consent_records ??= []).push({ id: uuid(), created_at: now(), person_id: person.id, guardian_name: p_guardian_name ?? '', guardian_email: String(p_guardian_email).toLowerCase(), scope: { account: false, cross_school: false, photos: false, name_on_records: false }, method: 'email_link', terms_version: '2026-10', token: uuid(), granted_at: null, withdrawn_at: null });
    }
    const pid = person.id;
    if (db.role_assignments.some((r) => r.person_id === pid && r.org_id === p_org && r.role === p_role && r.status !== 'alumni')) return fail('They already hold this role at that school.');
    db.role_assignments.push({ id: uuid(), created_at: now(), person_id: pid, org_id: p_org, role: p_role, status: 'active', local_title: String(p_local_title ?? '').trim() || null, seat: null, term_start: now().slice(0, 10), term_end: null });
    if (p_move_projects) {
      const indep = db.role_assignments.filter((r) => r.person_id === pid && r.status !== 'alumni' && db.organisations.find((o) => o.id === r.org_id)?.org_type === 'independent').map((r) => r.org_id);
      for (const t of ['projects', 'records', 'evidence']) for (const row of db[t] ?? []) if (indep.includes(row.org_id)) row.org_id = p_org;
      for (const r of db.role_assignments) if (r.person_id === pid && indep.includes(r.org_id)) r.status = 'alumni';
    }
    return { data: pid, error: null };
  },
};

// ---------------- The client ----------------
type AuthListener = (event: string, session: unknown) => void;
const listeners = new Set<AuthListener>();
const emit = (event: string) => { const s = getSession(); for (const l of listeners) l(event, s ? { user: s } : null); };
const delay = <T,>(v: T) => new Promise<T>((res) => setTimeout(() => res(v), 60));

export const demoClient = {
  from(table: string) {
    return new Builder(table);
  },
};

export const demoSupabase = {
  from: demoClient.from,
  rpc(name: string, args: Row = {}) {
    const fn = RPC[name];
    const db = load();
    const out = fn ? fn(args, db) : fail(`${name} is not available in the preview.`);
    persist();
    return delay(out);
  },
  auth: {
    getUser: () => { const s = getSession(); return delay({ data: { user: s ? { id: s.id, email: s.email } : null }, error: null }); },
    onAuthStateChange(cb: AuthListener) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    /** In the preview an email signs in at once: there is no inbox to check. */
    async signInWithOtp({ email }: { email: string; options?: unknown }) {
      const db = load();
      const addr = email.trim().toLowerCase();
      const person = db.people?.find((p) => String(p.email).toLowerCase() === addr);
      let id = person?.auth_user_id as string | undefined;
      if (person && !id) { id = `auth-${person.id}`; person.auth_user_id = id; persist(); }
      setSession({ id: id ?? `auth-${addr}`, email: addr });
      emit('SIGNED_IN');
      return delay({ data: {}, error: null });
    },
    signInWithOAuth: () => delay({ data: null, error: { message: 'Google sign-in is not part of the preview. Type any email below, or pick a person.' } }),
    async signOut() {
      setSession(null);
      emit('SIGNED_OUT');
      return { error: null };
    },
  },
  storage: {
    from: (_bucket: string) => ({
      async upload(path: string, file: Blob) {
        if (file.size < 600_000) {
          const url = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });
          (load()._files ??= []).push({ id: path, url });
          persist();
        }
        return { data: { path }, error: null };
      },
      async createSignedUrl(path: string) {
        return { data: { signedUrl: load()._files?.find((f) => f.id === path)?.url ?? null }, error: null };
      },
      async remove() { return { data: null, error: null }; },
    }),
  },
  functions: {
    // No emails or AI in the preview. Record drafting falls back to its own draft.
    invoke: (name: string) => delay(name === 'ai-draft' ? { data: null, error: { message: 'Not available in the preview.' } } : { data: null, error: null }),
  },
};


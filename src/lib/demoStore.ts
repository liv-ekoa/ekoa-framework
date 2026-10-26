// Demo mode: an in-browser stand-in for Supabase. It implements the small subset of
// the supabase-js query builder this app uses, so every page is written once against
// one API and runs either on a real Supabase project or on seeded demo data.

import { buildSeed } from './seed';

type Row = Record<string, any>;
type Tables = Record<string, Row[]>;
type Filter = (r: Row) => boolean;

const STORAGE_KEY = 'ekoa-demo-v8';

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
      out = rows.filter(match);
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
          const row = { id: uuid(), created_at: now, ...item };
          rows.push(row);
          out.push(row);
        }
      }
      persist();
    } else if (this.op === 'update') {
      out = rows.filter(match);
      for (const r of out) Object.assign(r, this.payload);
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

export const demoClient = {
  from(table: string) {
    return new Builder(table);
  },
};

export type DbClient = typeof demoClient;

// Preview branch: the same client API as Supabase, served by the in-browser demo store
// (src/lib/demoStore.ts). The rest of the app is identical to the live site.
import type { SupabaseClient } from '@supabase/supabase-js';
import { demoSupabase } from './demoStore';

export const supabase = demoSupabase as unknown as SupabaseClient;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: { from: (table: string) => any } = demoSupabase;

export async function must<T>(q: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export const uuid = () => crypto.randomUUID();

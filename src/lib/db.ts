// One data client for the whole app: the real Supabase client when keys are set,
// otherwise the in-browser demo store with the same query API.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';
import { demoClient } from './demoStore';

export const supabase: SupabaseClient | null = config.isDemo
  ? null
  : createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: { from: (table: string) => any } = supabase ?? demoClient;

export async function must<T>(q: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

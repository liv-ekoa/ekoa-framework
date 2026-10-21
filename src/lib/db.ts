// One data client for the whole app: the Supabase project set in config.
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = createClient(config.supabaseUrl || 'https://not-configured.invalid', config.supabaseAnonKey || 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: { from: (table: string) => any } = supabase;

export async function must<T>(q: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export const uuid = () => crypto.randomUUID();

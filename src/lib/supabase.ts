import { createClient } from '@supabase/supabase-js';

/** Project reference from the Supabase dashboard (Settings → General). */
export const supabaseProjectRef = (import.meta.env.VITE_SUPABASE_PROJECT_REF ?? '').trim();

/**
 * REST/Auth base URL. Set `VITE_SUPABASE_URL` explicitly, or it defaults to
 * `https://<VITE_SUPABASE_PROJECT_REF>.supabase.co`.
 */
export const supabaseUrl = (() => {
  const explicit = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  if (explicit) return explicit;
  if (supabaseProjectRef) return `https://${supabaseProjectRef}.supabase.co`;
  return '';
})();

/** Public anon key (Settings → API). Safe for the browser with RLS enabled. */
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[WorkVault] Supabase: set VITE_SUPABASE_PROJECT_REF + VITE_SUPABASE_ANON_KEY (and optionally VITE_SUPABASE_URL) in .env — see .env.example'
  );
}

export const supabase = createClient(supabaseUrl || 'https://invalid.local', supabaseAnonKey || 'invalid-anon-key');

import { createClient } from '@supabase/supabase-js';

export function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input: any, init?: any) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}

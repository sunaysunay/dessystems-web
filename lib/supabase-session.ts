// Server-side resolution of *who the caller actually is*.
//
// The console previously identified callers by a `bop_uid` cookie that
// lib/auth.ts wrote from client-side JavaScript — not httpOnly, not signed,
// not bound to any session. Anyone could set bop_uid (or bop_role) in
// devtools and be treated as that user, or as super_admin.
//
// lib/supabase.ts already uses createBrowserClient from @supabase/ssr, which
// persists the Supabase session in cookies, so a real, verifiable auth token
// has been present on every request all along — nothing was reading it.
//
// getVerifiedUser() reads that token and calls getUser(), which validates it
// against the Supabase auth server rather than merely decoding it. getSession()
// is deliberately NOT used here: it trusts whatever is in the cookie.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type VerifiedUser = { id: string; email: string | null };

export async function getVerifiedUser(): Promise<VerifiedUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const store = await cookies();

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return store.getAll().map(({ name, value }) => ({ name, value }));
      },
      // Route handlers cannot always write cookies, and this path only ever
      // reads the session, so refresh writes are dropped on purpose.
      setAll() {},
    },
  });

  // Network round-trip to the auth server — a forged or expired token fails
  // here, which is the entire point.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}

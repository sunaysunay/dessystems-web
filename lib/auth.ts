'use client';
import { supabase, USING_MOCK } from './supabase';
import type { Role } from './scope-context';

export type Session = { email: string; role: Role } | null;

export async function getSession(): Promise<Session> {
  if (USING_MOCK || !supabase) {
    return { email: 'demo@dessystems.io', role: 'super_admin' };
  }
  // Supabase JS reads session from localStorage (client-side)
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  // Profile lookup. /api/bop/user/me now resolves the caller from the verified
  // Supabase session cookie, so no uid is passed — it used to be, and the route
  // trusted it, which made any user's profile and role readable by uuid.
  try {
    const res = await fetch('/api/bop/user/me');
    if (res.ok) {
      const profile = await res.json();
      // bop_role / bop_uid are deliberately no longer written. They were set
      // from client-side JS and then trusted server-side for authorization, so
      // setting bop_role=super_admin in devtools passed every isSuperAdmin()
      // check. Authorization now derives from the verified session — see
      // lib/api-guard.ts and lib/supabase-session.ts. bop_locale stays: it is
      // a display preference and grants nothing.
      if (profile.language) {
        document.cookie = `bop_locale=${profile.language};path=/;max-age=31536000;samesite=lax`;
      }
      return {
        email: profile.email ?? user.email ?? '—',
        role: (profile.role as Role) ?? 'viewer',
      };
    }
  } catch {}

  return { email: user.email ?? '—', role: 'viewer' };
}

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  if (USING_MOCK || !supabase) return {};
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: error.message } : {};
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

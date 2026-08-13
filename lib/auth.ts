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

  // Role lookup via server API (service role key — secure, server-side only)
  // Pass uid so server can look up profile without needing cookie-based session
  try {
    const res = await fetch(`/api/bop/user/me?uid=${user.id}`);
    if (res.ok) {
      const profile = await res.json();
      // Set bop_role cookie for middleware enforcement
      if (profile.role) {
        document.cookie = `bop_role=${profile.role};path=/;max-age=31536000;samesite=lax`;
        document.cookie = `bop_uid=${user.id};path=/;max-age=31536000;samesite=lax`;
      }
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

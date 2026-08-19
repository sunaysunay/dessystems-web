// DESPANEL-V2 — server-side PBAC guard for API routes.
import { getServerClient } from '@/lib/supabase-server';
import { canAccess, type Action } from '@/lib/pbac';
import type { Role } from '@/lib/scope-context';

/**
 * Assert that the current authenticated user has permission to perform
 * `action` on `module`.  Throws a `Response`-compatible error (status 401
 * or 403) when the check fails — callers in Next.js route handlers can
 * catch and return it directly.
 *
 * Usage:
 *   await requirePermission('markets.pricing', 'edit');
 */
export async function requirePermission(module: string, action: Action): Promise<{ email: string; role: Role }> {
  const supabase = getServerClient();

  // Identify the caller via their auth token (forwarded by the client).
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user?.email) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  // Look up the user's role from the profile table.
  const { data: profile } = await supabase
    .from('bop_user_profiles')
    .select('role')
    .eq('email', user.email)
    .single();

  const role = (profile?.role ?? 'viewer') as Role;

  if (!canAccess(role, module, action)) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden', module, action, role }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    );
  }

  return { email: user.email, role };
}

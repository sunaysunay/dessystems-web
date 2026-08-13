import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

// GET /api/bop/sys/health
// Returns health map: { [screen_id]: 'ok' | 'warn' | 'error' }
// Primary: check admin_notifications for route-specific errors (last 24h)
// Fallback: derive from lifecycle_state
export async function GET() {
  const supabase = getServerClient();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [screensRes, notifRes] = await Promise.all([
    supabase.from('bop_screens').select('screen_id,lifecycle_state,route'),
    supabase.from('admin_notifications')
      .select('meta,type,is_read,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const screens = screensRes.data ?? [];
  const notifs  = notifRes.data ?? [];

  // Build route → max severity map from notifications
  const routeSeverity: Record<string, 'error' | 'warn'> = {};
  for (const n of notifs) {
    const route: string = n.meta?.route ?? '';
    const level: string = n.meta?.level ?? n.type ?? '';
    if (!route) continue;
    const sev = level === 'error' || level === 'critical' ? 'error' : 'warn';
    if (!routeSeverity[route] || sev === 'error') routeSeverity[route] = sev;
  }

  const health: Record<string, 'ok' | 'warn' | 'error'> = {};
  for (const s of screens) {
    // Check notification match
    const notifMatch = routeSeverity[s.route];
    if (notifMatch) { health[s.screen_id] = notifMatch; continue; }

    // Lifecycle fallback
    const lc = s.lifecycle_state ?? 'dev';
    if (lc === 'released')                              health[s.screen_id] = 'ok';
    else if (['deprecated', 'archived'].includes(lc))  health[s.screen_id] = 'error';
    else                                                health[s.screen_id] = 'warn';
  }

  return NextResponse.json({ health });
}

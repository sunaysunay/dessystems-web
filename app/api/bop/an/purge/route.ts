import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  const sb = getServerClient();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { count: c1, error: e1 } = await sb
    .from('dm_activity_log')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff);
  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });

  const { count: c2, error: e2 } = await sb
    .from('dm_activity_sessions')
    .delete({ count: 'exact' })
    .lt('started_at', cutoff);
  if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    deleted: (c1 ?? 0) + (c2 ?? 0),
    detail: {
      dm_activity_log: c1 ?? 0,
      dm_activity_sessions: c2 ?? 0,
    },
    cutoff,
  });
}

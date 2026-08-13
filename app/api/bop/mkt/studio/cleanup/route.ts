// app/api/bop/mkt/studio/cleanup/route.ts
// Purge old studio sessions from storage + DB
// Called by cron: POST with STUDIO_WORKER_SECRET header

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const WORKER_SECRET = process.env.STUDIO_WORKER_SECRET ?? '';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  if (!WORKER_SECRET || auth !== `Bearer ${WORKER_SECRET}`) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const sb = createClient(SUPA_URL, SRK);
  const now = new Date();

  const cutoffActive = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days
  const cutoffCancelled = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  // Find sessions to purge
  const { data: sessions } = await sb
    .from('bop_studio_sessions')
    .select('id, status')
    .or(
      `and(status.neq.cancelled,created_at.lt.${cutoffActive}),` +
      `and(status.eq.cancelled,created_at.lt.${cutoffCancelled})`
    );

  let purged = 0;

  for (const session of sessions ?? []) {
    // List and delete storage files for this session
    const { data: files } = await sb.storage.from('studio').list(session.id, { limit: 1000 });
    if (files?.length) {
      const paths = files.map((f: { name: string }) => `${session.id}/${f.name}`);
      await sb.storage.from('studio').remove(paths);
    }
    // Delete session row (cascades to images, steps, jobs)
    await sb.from('bop_studio_sessions').delete().eq('id', session.id);
    purged++;
  }

  return NextResponse.json({ ok: true, purged });
}

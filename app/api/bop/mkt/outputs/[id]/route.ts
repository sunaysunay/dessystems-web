// app/api/bop/mkt/outputs/[id]/route.ts — inline edit + approve/reject
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';
export const dynamic = 'force-dynamic';

// PATCH { body?, subject?, hashtags?, cta?, action?: 'approve'|'reset'|'archive' }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const sb = getServerClient();
  const b = await req.json();
  const patch: any = { updated_at: new Date().toISOString() };
  for (const k of ['body', 'subject', 'cta', 'image_prompt']) if (k in b) patch[k] = b[k];
  if ('hashtags' in b) patch.hashtags = b.hashtags;
  if (b.action === 'approve') { patch.status = 'approved'; patch.approved_by = uid; patch.approved_at = new Date().toISOString(); }
  else if (b.action === 'reset') { patch.status = 'draft'; patch.approved_by = null; patch.approved_at = null; }
  else if (b.action === 'archive') patch.status = 'archived';
  const { data, error } = await sb.from('bop_mkt_outputs').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ output: data });
}

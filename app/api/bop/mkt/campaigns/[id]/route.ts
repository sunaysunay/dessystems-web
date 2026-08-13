// app/api/bop/mkt/campaigns/[id]/route.ts — one campaign w/ latest outputs
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const [{ data: campaign }, { data: outputs }, { data: pubs }] = await Promise.all([
    sb.from('bop_mkt_campaigns').select('*').eq('id', id).maybeSingle(),
    sb.from('bop_mkt_outputs').select('*').eq('campaign_id', id).order('channel').order('locale'),
    sb.from('bop_mkt_publications').select('*, bop_mkt_outputs!inner(campaign_id)').eq('bop_mkt_outputs.campaign_id', id),
  ]);
  if (!campaign) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ campaign, outputs: outputs ?? [], publications: pubs ?? [] });
}
